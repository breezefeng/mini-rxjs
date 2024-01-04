export class Observable {
  constructor(subscribe) {
    this._subscribe = subscribe
  }

  subscribe(observer) {
    return this._subscribe(observer)
  }

  filter(predict) {
    return new Observable(observer => {
      const subscription = this.subscribe({
        next(v) {
          try {
            if (predict(v)) {
              observer.next(v)
            }
          } catch (e) {
            observer.error(e)
            subscription.unsubscribe()
          }
        },
        error(e) { observer.error(e) },
        complete() { observer.complete() }
      })

      return subscription
    })
  }

  map(partition) {
    return new Observable(observer => {
      const subscription = this.subscribe({
        next(v) {
          try {
            const value = partition(v)
            observer.next(value)
          } catch (e) {
            observer.error(e)
            subscription.unsubscribe()
          }
        },
        error(e) { observer.error(e) },
        complete() { observer.complete() }
      })

      return subscription
    })
  }

  retry(num) {
    return new Observable(observer => {
      let currentSub = null
      const processRequest = currentAttempNumber => {
        currentSub = this.subscribe({
          next(v) {
            observer.next(v)
          },
          complete() {
            observer.complete()
          },
          error(err) {
            if (currentAttempNumber === 0) {
              observer.error(err)
            } else {
              processRequest(currentAttempNumber - 1)
            }
          }
        })
      }

      processRequest(num)

      return {
        unsubscribe() { currentSub.unsubscribe() }
      }
    })
  }

  share() {
    const subject = new Subject()
    this.subscribe(subject)
    return subject
  }

  observerOn(scheduler) {
    return new Observable(observer => {
      return this.subscribe({
        next(v) {
          scheduler(() => observer.next(v))
        },
        error(e) {
          scheduler(() => observer.error(e))
        },
        complete() {
          scheduler(() => observer.complete())
        }
      })
    })
  }

  static create(subscribe) {
    return new Observable(subscribe)
  }

  static of(value) {
    return new Observable(observer => {
      observer.next(value)
      observer.complete()

      return {
        unsubscribe() { }
      }
    })
  }

  static timeout(time) {
    return new Observable(observer => {
      console.log('CALLING SETTIMEOUT')
      const timer = setTimeout(() => {
        observer.next()
        observer.complete && observer.complete()
      }, time)

      return {
        unsubscribe() {
          clearTimeout(timer)
        }
      }
    })
  }

  static fromEvent(dom, eventName) {
    return new Observable(observer => {
      const handler = ev => observer.next(ev)

      dom.addEventListener(eventName, handler)

      return {
        unsubscribe() {
          dom.removeEventListener(eventName, handler)
        }
      }
    })
  }

  static concat(...observables) {
    return new Observable(observer => {
      let myObservables = observables.slice()
      let currentSub = null

      const processObservable = () => {
        if (myObservables.length === 0) {
          observer.complete()
        } else {
          let observable = myObservables.shift()
          currentSub = observable.subscribe({
            next(v) {
              observer.next(v)
            },
            error(err) {
              observer.error(err)
              currentSub.unsubscribe()
            },
            complete() {
              processObservable()
            }
          })
        }
      }

      processObservable()

      return {
        unsubscribe() { currentSub.unsubscribe() }
      }
    })
  }

}

export class Subject extends Observable {
  constructor() {
    super(observer => {
      this.observers.add(observer)

      return {
        unsubscribe: () => this.observers.delete(observer)
      }
    })
    this.observers = new Set()
  }

  next(v) {
    for (let observer of [...this.observers]) {
      observer.next(v)
    }
  }

  error(v) {
    for (let observer of [...this.observers]) {
      observer.error(v)
    }
  }

  complete() {
    for (let observer of [...this.observers]) {
      observer.complete()
    }
  }
}
