# I-Regexp for JavaScript

Check regular expressions for compliance with [RFC 9485](https://datatracker.ietf.org/doc/html/rfc9485).

## Install

```
npm install --save iregexp-check
```

## Usage

```js
import { check } from "iregexp-check";

check(String.raw`[ab]{3}`); // true
check(String.raw`[0-9]*?`); // false
```
