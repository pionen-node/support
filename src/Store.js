import EventEmitter from 'EventEmitter';

export class Store {
  constructor(state = {}, clone = false, event = new EventEmitter()) {
    if (! _.isObject(state)) {
      throw new TypeError('Cannot create a store with a non-object as state');
    }
    if (! event instanceof EventEmitter) {
      throw new TypeError('Cannot create a store without a EventEmitter instance as event');
    }

    if (clone) {
      state = _.clone(state);
      Reflect.deleteProperty(state, Store.symbolStore);

      state = new Store(state, false);
    }

    if (Store.isState(state)) {
      state[Store.symbolStore].setEvent(event);
    }

    const store = this;

    Reflect.defineProperty(store, Store.symbolState, {
      value: state,
    });
    Reflect.defineProperty(store, Store.symbolEvent, {
      value: event,
    });
    Reflect.defineProperty(state, Store.symbolStore, {
      value: store,
    });

    return state;
  }
  setState(entry, merge = true, depth = false) {
    const store = this;
    const state = this[Store.symbolState];

    if (_.isFunction(entry)) {
      entry = entry.call(store, state, store);
    }

    if (merge) {
      if (_.isArrayLike(state) && _.isArrayLike(entry)) {
        entry = _.concat(state, entry);
      }

      if (depth) {
        _.mergeWith(state, entry, (prevState, nextState, props) => {
          if (Store.isState(prevState)) {
            prevState.setState(nextState, merge, depth);
          } else {
            return nextState;
          }
        })
      } else {
        _.assign(state, entry);
      }
    }

    this[Store.symbolEvent].emit(
      'setState', state, store,
    );

    return true;
  }
  setEvent(event = []) {
    if (! _.isArrayLike(event)) {
      event = [event];
    }

    _.each(event, (event) => {
      let store = this;

      if (event instanceof EventEmitter) {
        return store.setEvent(event.listeners('setState'));
      }

      if (Store.isState(event)) {
        store = event[Store.symbolStore];
        event = () => {
          this.setState();
        };
      }

      store[Store.symbolEvent].addListener('setState', event);
      return true;
    });

    return true;
  }
  static get symbolEvent() {
    return Symbol.for('StoreEvent');
  }
  static get symbolState() {
    return Symbol.for('StoreState');
  }
  static get symbolStore() {
    return Symbol.for('Store');
  }
  static get symbolProxy() {
    return Symbol.for('StoreProxy');
  }
  static isState(state) {
    return _.isObjectLike(state) && Store.symbolStore in state;
  }
  static isProxy(store) {
    return _.isObjectLike(store) && Store.symbolProxy in store;
  }
}

export default class StoreProxy extends Store {
  constructor(state, clone, event) {
    state = super(state, clone, event);
    const store = state[Store.symbolStore];

    if (Store.isProxy(store)) {
      return state;
    }

    const proxy = new Proxy(
      state,
      {
        get(state, entry) {
          const store = state[Store.symbolStore];

          if (Reflect.has(state, entry)) {
            return state[entry];
          }

          if (Reflect.has(store, entry)) {
            if (_.isFunction(store[entry])) {
              return (...args) => store[entry](...args);
            }
            return store[entry];
          }
        },
        set(state, entry) {
          throw new TypeError(`Cannot perform a mutation for '${_.toString(entry)}' on a state proxy, you must use setState().`);
        },
      },
    );

    Reflect.defineProperty(proxy, Store.symbolStore, {
      value: store,
    });
    Reflect.defineProperty(store, Store.symbolProxy, {
      value: proxy,
    });

    return proxy;
  }
}