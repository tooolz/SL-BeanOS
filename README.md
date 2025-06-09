# SL-BeanOS

Initially developed in August 2023, after the shutdown of the Mewsic Player.
It ran for approx. 18 months providing people in Second Life the ability to upload music for free.
Approx. 270'000 songs (~50mill files) were upload throughout it's lifespan.

# Requirements:
- A Corrade bot
- A SL Premium+ Account (free uploads)
- Experience with NodeJS
- Experience with YTDL
- A MySQL server

# Installation:
- download files,
- "npm install" within the folder,
- configure credentials in ./include/db.creds.js
- execute sl_BeanOS.sql on a fresh SQL database
- open cmd and run "node server.js"

# Comes as is with no support provided.
This project was a constant battle to support on all fronts,
from YouTube's monthly updates breaking YTDL,
to LindenLabs decades long neglect of their own infastructure.
Don't expect this project to run easy.
