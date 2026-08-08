type PromiseConstructorWithTry = PromiseConstructor & {
  try?<T>(callback: () => T | PromiseLike<T>): Promise<T>
}

const promiseConstructor = Promise as PromiseConstructorWithTry

if (!promiseConstructor.try) {
  promiseConstructor.try = <T>(callback: () => T | PromiseLike<T>) => Promise.resolve().then(callback)
}
