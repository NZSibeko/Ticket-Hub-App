var fs = require("fs");
var path = require("path");

var root = process.cwd();
var err = 0;
var warn = 0;

console.log("Pre-Build Checks");
console.log("");

if (fs.existsSync(root + "/.env")) {
  console.log("OK: .env");
} else {
  console.log("ERROR: .env missing");
  err = err + 1;
}

if (fs.existsSync(root + "/eas.json")) {
  console.log("OK: eas.json");
} else {
  console.log("ERROR: eas.json missing");
  err = err + 1;
}

if (fs.existsSync(root + "/app.json")) {
  console.log("OK: app.json");
} else {
  console.log("ERROR: app.json missing");
  err = err + 1;
}

if (fs.existsSync(root + "/package.json")) {
  var pkg = JSON.parse(fs.readFileSync(root + "/package.json"));
  if (pkg.dependencies && pkg.dependencies.jsonwebtoken) {
    console.log("OK: jsonwebtoken");
  } else {
    console.log("ERROR: jsonwebtoken missing");
    err = err + 1;
  }
} else {
  console.log("ERROR: package.json missing");
  err = err + 1;
}

if (fs.existsSync(root + "/node_modules")) {
  console.log("OK: node_modules");
} else {
  console.log("WARN: run npm install");
  warn = warn + 1;
}

var files = ["backend/server.js", "backend/app.js", "backend/database.js"];
for (var i = 0; i < files.length; i++) {
  if (fs.existsSync(root + "/" + files[i])) {
    console.log("OK: " + files[i]);
  } else {
    console.log("ERROR: " + files[i] + " missing");
    err = err + 1;
  }
}

console.log("");
console.log("=================== =");
if (err === 0) {
  console.log("READY TO BUILD");
  process.exit(0);
} else {
  console.log("ERRORS: " + err);
  process.exit(1);
}
