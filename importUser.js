const AWS = require("aws-sdk");
const arangojs = require("arangojs");
const db = new arangojs.Database({
  url: "http://3.84.251.210:8529",
  databaseName: "nomadago",
});
const axios = require("axios");
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: "us-east-1",
});
const api = axios.create({
  baseURL: "https://app.nomadago.com/api/1.1/obj",
});
const uuid = require("uuid");

const countryJs = require("./countries");
function uniq(a, key) {
  const seen = {};
  return a.filter((item) => {
    return seen.hasOwnProperty(item[key]) ? false : (seen[item] = true);
  });
}
(async () => {
  await Promise.all([
    await db.collection("plan").truncate(),
    await db.collection("user").truncate(),
    await db.collection("commented").truncate(),
    await db.collection("location").truncate(),
    await db.collection("attached").truncate(),
    await db.collection("friendship").truncate(),
    await db.collection("join").truncate(),
    await db.collection("notified").truncate(),
  ]);
  const userPool = "us-east-1_ZzOuuKMNm";
  let resp = await api.get("/User").then((d) => d.data.response);
  let users = resp.results;

  while (resp.remaining > 0) {
    resp = await api
      .get("/User", {
        params: {
          limit: resp.remaining < resp.count ? resp.remaining : resp.count,
          cursor:
            resp.cursor +
            (resp.remaining < resp.count ? resp.remaining : resp.count),
        },
      })
      .then((d) => d.data.response);
    users.push(...resp.results);
  }
  users = uniq(users, "ID");
  console.log(users[0].authentication);
  const cognitoUsers = [];
  for(const usr of users){
    // if(usr.authentication.email.email == "eirik.e.hansen@gmail.com"){
      let cogUser = await createUser(userPool, usr);
      if(cogUser){
        cognitoUsers.push(cogUser);
      }
    // }

  }
  // const cognitoUsers =  users
  //     // .filter(
  //     //   (user) => user.authentication.email.email === "hansen.ee@hotmail.com"
  //     // )
  //     .map((user) => createUser(userPool, user));
  await graphAddUser(cognitoUsers);
})();

 async function createUser(userPool, user) {
  let usr;
  console.log(user.authentication);
  if(user.authentication){
    // try {
    //    usr = await cognito
    //    .adminDeleteUser({
    //      UserPoolId: userPool,
    //      Username: user.authentication.email.email,
    //    })
    //     .promise();
    // } catch (e) {
    //   console.log(user.authentication.email.email)
    //   console.log(e)
    // }


    //  try {
    //   let x = await cognito
    //      .adminDisableUser({
    //        UserPoolId: userPool,
    //        Username: user.authentication.email.email,
    //      })
    //      .promise();
    //
    //  } catch(e){
    //    console.log(e);
    //  }
    // //
    //  try {
    //   let y = await cognito
    //     .adminDeleteUser({
    //       UserPoolId: userPool,
    //       Username: user.authentication.email.email,
    //     }).promise();
    //  } catch(e) {
    //   console.log(e);
    //  }

  }
  let newUuid = uuid.v4();
  const params = {
    UserPoolId: userPool,
    Username: user.authentication.email.email,
    DesiredDeliveryMediums: [],
    MessageAction: "SUPPRESS",
    ForceAliasCreation: true,
    UserAttributes: [
      {
        Value: user.authentication.email.email,
        Name: "email",
      },
      {
        Value: user["First Name"],
        Name: "name",
      },
      {
        Value: user.Username,
        Name: "preferred_username",
      },
      {
        Value: "true",
        Name: "email_verified",
      },
      {
        Value: `user/${newUuid}`,
        Name: "custom:userId"
      },
    ],
  };


  try{
    const cognitoUser = await cognito.adminCreateUser(params).promise();
    const passwordParams = {
      Permanent: true,
      Password: 'Testing123', /* required */
      UserPoolId: userPool, /* required */
      Username: user.authentication.email.email, /* required */
    };
    await cognito.adminSetUserPassword(passwordParams).promise();
    return {
      cUser: {
        Username: newUuid,
      },
      user,
    };
    // return null;
  } catch(e){
    console.log("problem creating user")
    console.log(user.authentication.email.email)
    console.log(e);
    return null;
  }
}

/*
- email:String
- name:String
- username:String
- created_date:Date
- image:String
- notificationSettings:NotificationSettings
- plans:Plan[]
- requests:User[]
- friends:User[]
- blocked:User[]
- likedPlans:Plan[]
- likedComment:Comment[]

 */


async function getDateTo(type, user, to) {
  const notif = await api
    .get("/Notifications", {
      params: {
        constraints: [
          { key: "type", constraint_type: "equals", value: type },
          {
            key: "touser",
            constraint_type: "equals",
            value: user,
          },
          { key: "fromuser", constraint_type: "equals", value: to },
        ],
      },
    })
    .then((d) => d.data.response.results);
  return notif[0];
  //[{ "key": "type", "constraint_type": "equals", "value": "joined" },{ "key": "fromuser", "constraint_type": "equals", "value": "joined" },{ "key": "plan", "constraint_type": "equals", "value": "joined" }]
}

async function graphAddUser(cUser) {
  await db.collection("user").import(
    cUser.map((c) => {
      return {
        _key: c.cUser.Username,
        name: c.user["First Name"],
        username: c.user.Username,
        email: c.user.authentication.email.email,
        created_date: c.cUser.UserCreateDate,
        banned: c.user.banned,
      };
    })
  );
  const plans = [];
  /*
    - name:String
  - start:Date
  - end:Date
  - private:Boolean
  - location:Location
  - owner:User
  - joined:User[]
  - comments:Comment[]
  - created_date:Date
  - description:String
  - likes:User[]
     */
  for (const u of cUser) {
    console.log(`${u.cUser.Username} plans`);
    if (u.user.plans) {
      for (const plan of u.user.plans) {
        try {
          const p = await api.get("/Plan/" + plan).then((d) => d.data.response);
          if (plans.find((tmpp) => tmpp.id === p.ID)) break;
          const _key = uuid.v4();

          // location
          /*
                - city:String
                - lat:Double
                - lng:Double
                - country:String
                 */
          let loc = p.Location.address.split(", ");
          let country = loc[loc.length - 1];
          let countryCode = countryToCountryCode(country);
          console.log(p.EndDate);
          let result = {
            id: p.ID,
            plan: {
              _key,
              name: p.name,
              start: p.StartDate,
              end: p.EndDate,
              created_at: p["Created Date"],
              updated_at: p["Modified Date"],
              description: p.description,
              private: true,
              external_id: p.ID,
            },
            location: {
              _key: uuid.v4(),
              city: loc[0],
              displayName: p.Location.address,
              country: countryCode,
              lat: p.Location.lat,
              lng: p.Location.lng,
            },
            comments: [],
            users: [],
          };
          // comments
          /*
                - text:String
                - owner:User
                - plan:Plan
                - created_date:Date
                - likes:User[]
                 */

          if (p.usertotal && p.usertotal.length > 0) {
            for (const sUser of p.usertotal) {
              try {
                const tar = cUser.find((m) => m.user.ID === sUser);
                let join = {
                  _from: "user/" + tar.cUser.Username,
                  _to: "plan/" + result.plan._key,
                };
                if (p["Created By"] && p["Created By"] === sUser) {
                  join.owner = true;
                  result.plan.owner = "user/" + tar.cUser.Username;

                  result.users.push(join);
                } else if (p.UsersJoining && p.UsersJoining.includes(sUser)) {
                  join.joinStatus = "JOINED";
                  result.users.push(join);
                }
              } catch (e) {
                console.log(
                  e,
                  sUser,
                  cUser.find((m) => m.user.ID === sUser)
                );
              }
            }
          }
          if (p.comments && p.comments.length > 0) {
            for (const comment of p.comments) {
              const c = await api
                .get("/Comment/" + comment)
                .then((d) => d.data.response);
              const owner = cUser.find((m) => m.user.ID === c.user);
              if (!c.commenttext) {
                c.commenttext = c.comment;
              }
              result.comments.push({
                _key: result.plan._key + "_" + uuid.v4(),
                text: c.commenttext,
                _from: "user/" + owner.cUser.Username,
                _to: "plan/" + result.plan._key,
                created_date: c["Created Date"],
              });
            }
          }
          plans.push(result);
        } catch (e) {
          console.log(e);
        }
      }
    }
    await Promise.all(plans.map((lm) => createPlan(lm)));
    plans.length = 0;
    console.log(`${u.cUser.Username} friends`);
    if (u.user.friends) {
      for (const friend of u.user.friends) {
        try {
          const tar = cUser.find((m) => m.user.ID === friend);
          if (
            (await db
              .collection("friendship")
              .documentExists(tar.cUser.Username + "_" + u.cUser.Username)) ===
            false
          ) {
            await db.collection("friendship").save(
              {
                _key: u.cUser.Username + "_" + tar.cUser.Username,
                _from: "user/" + u.cUser.Username,
                _to: "user/" + tar.cUser.Username,
              },
              {
                overwriteMode: "replace",
              }
            );
          }
        } catch (e) {
          console.log(
            friend,
            cUser.find((m) => m.user.ID === friend)
          );
          console.log(e);
        }
      }
    }
  }
}

function countryToCountryCode(country){
  let c = countryJs.searchByCountry(country);
  if(c == null || c.iso == null){
    return country;
  }
  return c.iso;
}

async function createPlan(plan) {
  try {
    await db.collection("plan").save(plan.plan);
  } catch (e) {
    console.error("ERROR", e, plan.plan);
  }
  try {
    await db.collection("commented").import(plan.comments);
  } catch (e) {
    console.error("ERROR", e, plan.comments);
  }
  try {
    await db.collection("join").import(plan.users);
  } catch (e) {
    console.error("ERROR", e, plan);
  }
  try {
    await db
      .collection("location")
      .save(plan.location, { overwriteMode: "ignore" });
  } catch (e) {
    console.error("ERROR", e, plan.location);
  }
  try {
    await db.collection("attached").save({
      _from: "location/" + plan.location._key,
      _to: "plan/" + plan.plan._key,
    });
  } catch (e) {
    console.error("ERROR", e, plan.attached);
  }
}
