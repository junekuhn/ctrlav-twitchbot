// local
const config = require("./config.js");
const ui = require("./ui.js");
const effectsList = require("./effects.json");
// packages
const osc = require("node-osc");
const oscClient = new osc.Client(config.network.host, config.network.port);
const oscAddr = config.network.address;
const tmi = require("tmi.js");

let connections = [];

const twitchClient = new tmi.client(config.twitch);
twitchClient.on('message', onMessageHandler);
twitchClient.on('connected', onConnectedHandler);
twitchClient.connect();

ui.render();

function updateUI() {
  for ([i, connection] of connections.entries()) {
    ui.addConnection(i, connection)
  }
}

function parseMessage(msg) {
  let current = ({pattern: "", effects:{name: "", pattern: ""}});

  let match = msg.match(/"(.*?)"/)
  current.pattern = match[1]

  const effectPairs = msg.split('# ')
  let effects = []
  effectPairs.shift() // remove first pattern
  for (pair of effectPairs) {
    pair = pair.split(' ')
    const name = pair.shift()
    const pat = pair.join(" ").replace(/"/g, "").trim()
    effects.push({name: name, pattern: pat})
  }
  current.effects = effects;

  return current
}

const commands = {
  about: "ctrlAV is an ecosystem for audiovisual performers and their audiences to try new things and brainstorm for a new tomorrow",
  today: "Looking at the various things OBS has to offer, regardless of streaming",
  commands: () => {
    return Object.keys(commands)
      .map((command) => " !" + command)
    },
  schedule: "The livestream schedule is 8-10pm EST (+5 UTC) on Thursdays, but the topics have not been decided yet",
  zork: "West of House This is an open field west of a white house, with a boarded front door. There is a small mailbox here. A rubber mat saying 'Welcome to Zork!' lies by the door.",
  discord: "Here's an invite to the discord channel :) https://discord.gg/F8DTjyZgRY",
  samples: "A list of all the Tidal Samples can be found at https://github.com/tidalcycles/Dirt-Samples",
  language: "Tidalcycles is a live coding Haskell library that can make patterns of sound. More info at https://tidalcycles.org"
}

function handleNewMessage(msg, username) {

  try {
    // common messages
       // empty
    if (msg === "!t" || msg === "" || msg === " " || msg === "\"\"" || !msg) { return `error: pattern from ${username} empty, maybe try !t \"bd sn cp hh\" ?` }
       // single quote
    if (msg === "\"") { return `error: could not parse pattern ${msg} from ${username}` }
       // help
    if (msg === "help") {return `usage: !t \"pattern\" | example: !t \"bd sn cp hh\" | !osc silence`}


       // silence user's pattern
    if (msg === "silence") {
      for ([i, connection] of connections.entries()) {
        if (connection.user === username) {
          oscClient.send(oscAddr, "p" + i, "")
          connections.splice(i, 1)
          updateUI()
          return `silenced ${username}'s pattern`;
        }
      }
    }

    // replace other double quotes with "" (related to mobile)
    msg = msg.replace(/”|“/g, "\"") //


    const parsed = parseMessage(msg)
    let current = ({user: username, pattern: parsed.pattern, effects: parsed.effects})

    if (connections.length === 0) { 
      // if there are no connections just add the new connection
      connections.push(current)
    } else if (connections.length < config.maxActivePatterns){
      let match = false;
      for (connection of connections) {
        // if the user already has a connection
        if (connection.user === current.user) {
          Object.assign(connection, current)
          match = true;
          break;
        }
      }
      if (!match) { connections.push(current) }
    } else if (connections.length === config.maxActivePatterns) {
      // remove last sent connection and replace with the new one
      connections.push(current)
      connections.shift()
    }


    // prep osc messages
    let messages = []
    for ([i, connection] of connections.entries()) {
      let patternMsg = new osc.Message(oscAddr) // for 's'
      patternMsg.append(`p${i}`)
      patternMsg.append(connection.pattern)

      // update local effects list with values from connection
      let localEffectsList = JSON.parse(JSON.stringify(effectsList))
      for (listEffect of localEffectsList) {
        for (const connectionEffect of connection.effects) {
          if (connectionEffect.name === listEffect.name) {
            listEffect.pattern = connectionEffect.pattern
          }
        }
      }

      let effectMsgs = []

      for (const listEffect of localEffectsList) {
        let effectMsg = new osc.Message(oscAddr)  // for gain, speed etc
        effectMsg.append(`p${i}-${listEffect.name}`)
        effectMsg.append(listEffect.pattern)
        effectMsgs.push(effectMsg)
      }

      messages.push({pattern: patternMsg, effects: effectMsgs})
    }


    // send osc messages
    for (const message of messages) {
      oscClient.send(message.pattern ,() => {});
      if (message.effects.length) {
        for (const me of message.effects)
        oscClient.send(me, () => {});
      }
    }

    updateUI()

    return `pattern "${current.pattern}" from ${current.user} sent`
  } catch (err) {
    return `${err.name} in message from ${username}, try checking your syntax?`
  }
}

function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // ignore messages from the bot

  // get first 'word' (all chars until whitespace)
  const commandName = msg.split(' ')[0]

  switch(commandName) {
    case '!today':
      twitchClient.say(target, `Today's topic is ${commands.today}`);
      console.log(`ran ${commandName}`);
      break;
    case '!commands':
      twitchClient.say(target, `Available commands are ${commands.commands()}`)
      console.log(`ran ${commandName}`);
      break;
    case '!about':
      twitchClient.say(target, commands.about)
      console.log(`ran ${commandName}`);
      break;
    case '!schedule':
      twitchClient.say(target, commands.schedule)
      console.log(`ran ${commandName}`);
      break;
    case '!zork':
      twitchClient.say(target, commands.zork)
      console.log(`ran ${commandName}`);
      break;
    case "!discord":
      twitchClient.say(target, commands.discord)
      console.log(`ran ${commandName}`);
    case "!samples":
      twitchClient.say(target, commands.samples)
      console.log(`ran ${commandName}`);
    case "!language":
      twitchClient.say(target, commands.language)
      console.log(`ran ${commandName}`);
    case "!t":
      const result = handleNewMessage(msg.substr(msg.indexOf(" ") + 1), context.username);
      twitchClient.say(target, result);
      break;
  }
}

function onConnectedHandler (addr, port) {
  ui.onTwitchConnected(addr, port)
}
