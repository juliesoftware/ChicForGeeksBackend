const users = require("./users.json");
const friends = require("./resq.json");
const feed = require("./feed.json");

let res = [];

for (let p of friends) {
  if (!res.includes(p.plan._key)) {
    res.push(p.plan._key);
  } else {
    console.log("added1", p.plan._key);
  }
}
for (let p of users) {
  if (!res.includes(p.plan._key)) {
    res.push(p.plan._key);
  } else {
    console.log("added2", p.plan._key);
  }
}
for (let fp of feed) {
  if (!res.includes(fp.plan._key)) console.log(1, fp);
}
for (let fp of res) {
  if (!feed.find((m) => m.plan._key === fp)) console.log(2, fp);
}
