import { grammar } from "./grammar.js";
import { SessionDescription } from "./types.js";

// customized util.format - discards excess arguments and can void middle ones
const formatRegExp = /%[sdv%]/g;

function format(formatStr: string) {
  var i = 1;
  var args = arguments;
  var len = args.length;
  return formatStr.replace(formatRegExp, (x) => {
    if (i >= len) {
      return x; // missing argument
    }

    var arg = args[i];
    i += 1;
    switch (x) {
      case "%%":
        return "%";
      case "%s":
        return String(arg);
      case "%d":
        return Number(arg).toString();
      case "%v":
        return "";
      default:
        throw new Error(`Unsupported formatter: ${x}`);
    }
  });
  // NB: we discard excess arguments - they are typically undefined from makeLine
}

function makeLine(type, obj, location: any) {
  var str =
    obj.format instanceof Function
      ? obj.format(obj.push ? location : location[obj.name])
      : obj.format;

  var args = [type + "=" + str];
  if (obj.names) {
    for (var i = 0; i < obj.names.length; i += 1) {
      var n = obj.names[i];
      if (obj.name) {
        args.push(location[obj.name][n]);
      } else {
        // for mLine and push attributes
        args.push(location[obj.names[i]]);
      }
    }
  } else {
    args.push(location[obj.name]);
  }
  return format.apply(null, args);
}

// RFC specified order
// TODO: extend this with all the rest
const defaultOuterOrder = [
  "v",
  "o",
  "s",
  "i",
  "u",
  "e",
  "p",
  "c",
  "b",
  "t",
  "r",
  "z",
  "a",
];
const defaultInnerOrder = ["i", "c", "b", "a"];

export function write(
  session: SessionDescription,
  opts?: { outerOrder: string[]; innerOrder: string[] }
) {
  opts = {
    ...opts,
    innerOrder: defaultInnerOrder,
    outerOrder: defaultOuterOrder,
  };

  // ensure certain properties exist
  if (session.version == null) {
    session.version = 0; // 'v=0' must be there (only defined version atm)
  }
  if (session.name == null) {
    session.name = " "; // 's= ' must be there if no meaningful name set
  }
  session.media.forEach(function (mLine) {
    if (mLine.payloads == null) {
      mLine.payloads = "";
    }
  });

  var outerOrder = opts.outerOrder || defaultOuterOrder;
  var innerOrder = opts.innerOrder || defaultInnerOrder;
  var sdp: string[] = [];

  // loop through outerOrder for matching properties on session
  outerOrder.forEach(function (type) {
    grammar[type].forEach(function (obj) {
      if (obj.name in session && session[obj.name] != null) {
        sdp.push(makeLine(type, obj, session));
      } else if (obj.push in session && session[obj.push] != null) {
        session[obj.push].forEach(function (el) {
          sdp.push(makeLine(type, obj, el));
        });
      }
    });
  });

  // then for each media line, follow the innerOrder
  session.media.forEach(function (mLine) {
    sdp.push(makeLine("m", grammar.m[0], mLine));

    innerOrder.forEach(function (type) {
      grammar[type].forEach(function (obj) {
        if (obj.name in mLine && mLine[obj.name] != null) {
          sdp.push(makeLine(type, obj, mLine));
        } else if (obj.push in mLine && mLine[obj.push] != null) {
          mLine[obj.push].forEach(function (el) {
            sdp.push(makeLine(type, obj, el));
          });
        }
      });
    });
  });

  return sdp.join("\r\n") + "\r\n";
}
