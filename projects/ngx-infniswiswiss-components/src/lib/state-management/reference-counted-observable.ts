import {Observable} from 'rxjs';

export function referenceCountObservable<T>(tearDownLogic: () => void) {
    let subscribersCount = 0;

    return (source: Observable<T>): Observable<T> => {
        return new Observable<T>(subscriber => {
            subscribersCount++;
            const subscription = source.subscribe(notification => {
                subscriber.next(notification);
            });

            return {
                unsubscribe: () => {
                    subscribersCount--;
                    subscription?.unsubscribe();
                    if (subscribersCount <= 0) {
                        tearDownLogic();
                    }
                }
            };
        });
    };
}
