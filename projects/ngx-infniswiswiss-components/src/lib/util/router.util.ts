import {
    ActivationEnd,
    ChildActivationEnd,
    NavigationEnd,
    RouterEvent,
    RouteConfigLoadStart,
    RouteConfigLoadEnd,
    ChildActivationStart,
    ActivationStart,
    Scroll,
} from '@angular/router';

export type RouteChangeEvent =
    | RouterEvent
    | RouteConfigLoadStart
    | RouteConfigLoadEnd
    | ChildActivationStart
    | ChildActivationEnd
    | ActivationStart
    | ActivationEnd
    | Scroll;

export function isNavigationEnd(ev: RouteChangeEvent) {
    return ev instanceof ActivationEnd || ev instanceof ChildActivationEnd || ev instanceof NavigationEnd;
}
