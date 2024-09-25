# Data information

### Plan
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


### User
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

### Comment
- text:String
- owner:User
- plan:Plan
- created_date:Date
- likes:User[]

### Report
- reported:Plan
- owner:User
- created_date:Date

### Location
- city:String
- lat:Double
- lng:Double
- country:String

### NotificationSettings
- location:Boolean
- contactJoined:Boolean
- planJoined:Boolean
- planCommented:Boolean
- planLiked:Boolean
- commentLiked:Boolean


# Kind of query of the data

### Feed
- Get all future plans for me, friends and public
- Get all future plans within a country for me, friends and public
- Search user by Username

### Maps
- Get all plans within range for me, friends and public

### My Calendar
- Get all my future plans

### Profile
- Get 
