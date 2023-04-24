import { grammar } from "./grammar.js";
import { ParamMap, SessionDescription } from "./types.js";

function toIntIfInt(v: string) {
  return String(Number(v)) === v ? Number(v) : v;
}

function attachProperties(
  match: RegExpMatchArray | null,
  location: SessionDescription,
  names: string[],
  rawName: string
) {
  if (!match) {
    return;
  }

  if (rawName && !names) {
    location[rawName] = toIntIfInt(match[1]);
  } else {
    for (var i = 0; i < names.length; i += 1) {
      if (match[i + 1] != null) {
        location[names[i]] = toIntIfInt(match[i + 1]);
      }
    }
  }
}

function parseReg(obj: any, location: any, content: string) {
  var needsBlank = obj.name && obj.names;
  if (obj.push && !location[obj.push]) {
    location[obj.push] = [];
  } else if (needsBlank && !location[obj.name]) {
    location[obj.name] = {};
  }
  var keyLocation = obj.push
    ? {} // blank object that will be pushed
    : needsBlank
    ? location[obj.name]
    : location; // otherwise, named location or root

  attachProperties(content.match(obj.reg), keyLocation, obj.names, obj.name);

  if (obj.push) {
    location[obj.push].push(keyLocation);
  }
}

const validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);

export function parse(sdp: string): SessionDescription {
  const session: SessionDescription = { media: [] },
    media: any[] = [];

  // points at where properties go under (one of the above)
  let location: any = session;

  // parse lines we understand
  sdp
    .split(/(\r\n|\r|\n)/)
    .filter(validLine)
    .forEach(function (l) {
      var type = l[0];
      var content = l.slice(2);
      if (type === "m") {
        media.push({ rtp: [], fmtp: [] });
        location = media[media.length - 1]; // point at latest media line
      }

      for (var j = 0; j < (grammar[type] || []).length; j += 1) {
        var obj = grammar[type][j];
        if (obj.reg.test(content)) {
          return parseReg(obj, location, content);
        }
      }
    });

  session.media = media; // link it up
  return session;
}

function paramReducer(acc: {}, expr: string) {
  var s = expr.split(/=(.+)/, 2);
  if (s.length === 2) {
    acc[s[0]] = toIntIfInt(s[1]);
  } else if (s.length === 1 && expr.length > 1) {
    acc[s[0]] = undefined;
  }
  return acc;
}

export function parseParams(str: string): ParamMap {
  return str.split(/;\s?/).reduce(paramReducer, {});
}

// For backward compatibility - alias will be removed in 3.0.0
export const parseFmtpConfig = parseParams;

export function parsePayloads(str: string): number[] {
  return str.toString().split(" ").map(Number);
}

export function parseRemoteCandidates(str: string) {
  var candidates: Array<{ component: number; ip: string; port: number }> = [];
  var parts = str.split(" ").map(toIntIfInt);
  for (var i = 0; i < parts.length; i += 3) {
    candidates.push({
      component: parts[i] as number,
      ip: parts[i + 1] as string,
      port: parts[i + 2] as number,
    });
  }
  return candidates;
}

export function parseImageAttributes(str: string): ParamMap[] {
  return str.split(" ").map(function (item) {
    return item
      .substring(1, item.length - 1)
      .split(",")
      .reduce(paramReducer, {});
  });
}

export function parseSimulcastStreamList(str: string) {
  return str.split(";").map(function (stream) {
    return stream.split(",").map(function (format) {
      var scid,
        paused = false;

      if (format[0] !== "~") {
        scid = toIntIfInt(format);
      } else {
        scid = toIntIfInt(format.substring(1, format.length));
        paused = true;
      }

      return {
        scid: scid,
        paused: paused,
      };
    });
  });
}
