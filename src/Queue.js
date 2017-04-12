export default class Queue extends Array {
  constructor(...argArray) {
    super(...argArray);

    Reflect.defineProperty(this, 'cursor', {
      writable: true,
      value: 0,
    });
    Reflect.defineProperty(this, 'runner', {
      writable: true,
      value: 0,
    });
  }
  add(...record) {
    this.cursor = this.length;

    _.each(record, (record) => {
      this.put(record);
    });

    this.cursor = this.runner;

    return this;
  }
  put(record = [], cursor = this.cursor) {
    if (! _.isArray(record)) {
      record = [record];
    }

    cursor = Math.min(cursor, this.length);
    cursor = Math.max(cursor + (cursor < 0 && this.length), 0);

    this.splice(cursor, 0, ...record);
    this.cursor = cursor + record.length;

    return this;
  }
  async run(runner = this.runner) {
    runner = Math.min(runner, this.length);
    runner = Math.max(runner + (runner < 0 && this.length), 0);

    while (runner < this.length) {
      let  record = this[runner++];
      this.cursor = this.runner = runner;

      await this.resolve(record);
    }
  }
  all() {
    return Promise.all(
      _.map(this, (record) => {
        return this.resolve(record);
      }),
    );
  }
  resolve(record) {
    return Queue.resolve(this, record);
  }
  static resolve(queue, record) {
    if (_.isNumber(record)) {
      record = Queue.sleep(record);
    }

    if (_.isFunction(record)) {
      record = record(queue);
    }

    return Promise.resolve(record);
  }
  static async sleep(ms = 0) {
    return await new Promise(
      (resolver) => setTimeout(() => resolver(), ms)
    );
  }
}