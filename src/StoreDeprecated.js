import EventEmitter from 'EventEmitter';

/**
 * @deprecated
 */
export class Store {
  constructor(state = {}, event = new EventEmitter()) {
    if (Store.is(state)) {
      return state; //todo merge events
    }

    if (! _.isObject(state)) {
      throw new TypeError('Cannot create a store with a non-object as state');
    }
    if (! event instanceof EventEmitter) {
      throw new TypeError('Cannot create a store without a EventEmitter instance as event');
    }

    this[Store.symbolState] = state;
    this[Store.symbolEvent] = event;
  }
  setState(state, merge = true, depth = false) {
    if (! _.isObject(state)) {
      throw new TypeError('Cannot set the state with a non-object as state');
    }

    state =
      ((prevState, nextState) => {
        if (_.isFunction(nextState)) {
          nextState = nextState.call(this, Object.freeze(prevState));
        }

        if (merge) {
          if (_.isArrayLike(prevState) && _.isArrayLike(nextState)) {
            nextState = _.concat(prevState, nextState);
          }

          nextState = _.assign(prevState, nextState);
        }

        return nextState;
      })(this[Store.symbolState], state);

    this[Store.symbolState] = state;
    this[Store.symbolEvent].emit('setState', state, this);
    return true;
  }
  setEvent(storeEvent = []) {
    if (! _.isArrayLike(storeEvent)) {
      storeEvent = [storeEvent];
    }

    _.each(storeEvent, (storeEvent) => {
      let store = this;

      if (Store.is(storeEvent)) {
        store = storeEvent;
        storeEvent = () => {
          this[Store.symbolEvent].emit('setState', this[Store.symbolState], this, store);
        };
      }

      store[Store.symbolEvent].addListener('setState', storeEvent);
      return true;
    });

    return true;
  }
  static get symbolEvent() {
    return Symbol.for('StoreEvent');
  }
  static get symbolState() {
    return Symbol.for('Store');
  }
  static get symbolProxy() {
    return Symbol.for('StoreProxy');
  }
  static is(store) {
    return _.isObjectLike(store) && Store.symbolEvent in store && Store.symbolState in store;
  }
  static isProxy(store) {
    return _.isObjectLike(store) && Store.symbolProxy in store;
  }
}

/**
 * @deprecated
 */
const StoreProxy = new Proxy(
  Store,
  {
    construct(Store, args, proxy) {
      const store = new Store(...args);

      if (Store.isProxy(store)) {
        return store;
      }

      store[Store.symbolProxy] = proxy;
      return new Proxy(store, new Proxy(
        {
          get(store, state) {
            if (state in store) {
              return store[state];
            }

            return store[Store.symbolState][state];
          },
          has(store, state) {
            return state in store || state in store[Store.symbolState];
          },
          set(store, state, value) {
            if (state in store) {
              store[state] = value;
              return true;
            }

            throw new TypeError(`Cannot perform a mutation for '${_.toString(state)}' on a store proxy, you must use setState().`);
          },
        },
        {
          get(handler, trap) {
            return (store, ...args) => {
              if (! Reflect.has(handler, trap)) {
                console.info(`Reflect.${trap}`, ...args);
                return Reflect[trap](store[Store.symbolState], ...args);
              }

              console.info(`proxyHandler.${trap}`, ...args);
              return handler[trap](store, ...args);
            };
          },
        }
      ));
    },
  }
);
export default StoreProxy;