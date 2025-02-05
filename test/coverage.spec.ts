import { promises as fs } from "node:fs";
import { parse } from "../lib";

async function verifyCoverage(file: string) {
  var sdp = await fs.readFile(__dirname + "/" + file, "utf8");
  var obj = parse(sdp);
  obj.media.forEach(function (m) {
    expect(m.invalid).toBeFalsy();
    if (Array.isArray(m.invalid)) {
      expect(m.invalid).toEqual([]);
    }
  });
}

var sdps = [
  "normal.sdp",
  "hacky.sdp",
  "icelite.sdp",
  "jssip.sdp",
  "jsep.sdp",
  // 'alac.sdp', // deliberate invalids
  "onvif.sdp",
  "ssrc.sdp",
  "simulcast.sdp",
  "st2022-6.sdp",
  // 'st2110-20.sdp', // deliberate invalids
  "sctp-dtls-26.sdp",
  "extmap-encrypt.sdp",
  "dante-aes67.sdp",
  "bfcp.sdp",
  "tcp-active.sdp",
  "tcp-passive.sdp",
  "mediaclk-avbtp.sdp",
  "mediaclk-ptp-v2-w-rate.sdp",
  "mediaclk-ptp-v2.sdp",
  "mediaclk-rtp.sdp",
  "ts-refclk-media.sdp",
  "ts-refclk-sess.sdp",
  "rtcp-fb.sdp",
];

describe("coverage", () => {
  sdps.forEach((sdp) => {
    it(sdp.split(".")[0], async () => {
      await verifyCoverage(sdp);
    });
  });
});
