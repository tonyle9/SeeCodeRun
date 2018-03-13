import {Observable} from "rxjs/Rx";

export const getLocationUrlData=() => {
  return {
    url:
    process.env.PUBLIC_URL ||
    `${window.location.origin}`,
    hash: `${window.location.hash}`
  };
};

export const configureToMonacoRange=(monaco, parser) => {
  switch (parser) {
    case 'babylon':
    default:
      return range => {
        return new monaco.Range(range.start.line
          , range.start.column + 1
          , range.end ? range.end.line : range.start.line
          , range.end ? range.end.column + 1 : range.start.column + 1,
        );
      };
  }
};

export const configureMonacoRangeToClassname=(prefix='r') => {
  return (monacoRange, postfix='') => {
    return `${prefix}-${
      monacoRange.startLineNumber
    }-${
      monacoRange.startColumn
    }-${monacoRange.endLineNumber}-${monacoRange.endColumn}-${postfix}`;
  };
};

const isOnline$=
  Observable.of(window.navigator.onLine);
const goesOffline$=
  Observable.fromEvent(window, 'offline').mapTo(false);
const goesOnline$=
  Observable.fromEvent(window, 'online').mapTo(true);

export const online$=() =>
  Observable.merge(
    isOnline$,
    goesOffline$,
    goesOnline$
  );
export const end$= ()=>Observable.of(true);

