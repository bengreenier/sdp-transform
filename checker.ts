#!/usr/bin/env node

import * as transform from "./lib/index.js";
import { join as joinPath } from "node:path";
import { readFileSync } from "node:fs";

const file = joinPath(process.cwd(), process.argv[2]);
const sdp = readFileSync(file).toString();
const parsed = transform.parse(sdp);
const written = transform.write(parsed);
const writtenLines = written.split("\r\n");
const origLines = sdp.split("\r\n");

let numMissing = 0;
let numNew = 0;
let parseFails = 0;

parsed.media.forEach(function (media) {
  (media.invalid || []).forEach(function (inv) {
    console.warn(
      "unrecognized a=" + inv.value + " belonging to m=" + media.type
    );
    parseFails += 1;
  });
});
var parseStr = parseFails + " unrecognized line(s) copied blindly";

origLines.forEach(function (line, i) {
  if (writtenLines.indexOf(line) < 0) {
    console.error("l" + i + " lost (" + line + ")");
    numMissing += 1;
  }
});

writtenLines.forEach(function (line, i) {
  if (origLines.indexOf(line) < 0) {
    console.error("l" + i + " new (" + line + ")");
    numNew += 1;
  }
});

var failed = numMissing > 0 || numNew > 0;
if (failed) {
  console.log("\n" + file + " changes during transform:");
  console.log(
    numMissing + " missing line(s), " + numNew + " new line(s)%s",
    parseFails > 0 ? ", " + parseStr : ""
  );
} else {
  console.log(
    file + " verified%s",
    parseFails > 0 ? ", but had " + parseStr : ""
  );
}
process.exit(failed ? 1 : 0);
