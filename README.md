# AutoBSC++

This userscript automatically interacts with the Brawl Stars Championship stream, so you can receive all the rewards without doing anything.

Supported:
- Cheers (click on an emote during a match)
- Polls (select MVP after match, etc)
- Sliders (sometimes appears after a match, prompting you to rate it with a slider)
- Lootdrops (randomly appearing messages that give you some amount of points if you click within a small amount of time)
- Predictions (disabled by default, automatically places predictions before a match starts according to selected strategy)

Working as of August 16, 2026.

![AutoBSC showcase, a bit outdated, will be updated next time](https://github.com/LaptopCat/AutoBSC/raw/master/showcase.png)

## Quick Start

1. Install a userscript loader like [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/) or others.

2. Install AutoBSC by clicking [here](https://github.com/LaptopCat/AutoBSC/raw/master/autobsc.user.js).

3. Open the stream page on https://event.supercell.com/brawlstars/

4. If "AutoBSC++ loaded" is shown in the event logs, then it's working. Now you can just leave the tab open and let it do the work for you.


## Known/possible issues
- Cheers not being sent if no cheer emote selected
- [Script may fail to submit answers in time if your system clock is wrong](https://github.com/LaptopCat/AutoBSC/issues/6#issuecomment-5309955612)

## Differences from AutoBSC
This project is based on [AutoBSC](https://github.com/CatMe0w/AutoBSC), but has many differences from it

- AutoBSC++ has an overlay showing data and allowing you to quickly configure the script
- Quizzes are always answered correctly
- Many different ways to autopredict: always blue/red, random team or pick same as majority
- Automatically collect loot drops and sliders
- DOM-based interactions (ensures stuff, such as displaying your points always works)
- Logging of events, such as sending cheer, prediction or poll can be done in the feed on the right side of the screen

## Overlay
The overlay has two sections:
### Data
This section displays how many (allegedly*) users are connected, and how many predictions were made for each team.

> \* I don't know if this data is correct, but it is sent in the cheer message from the server

### Config
Allows you to configure the script using a GUI
- Autocheer:
Automatically send cheers (emojis on the bottom corners of the stream) to receive 5 points. Enabled by default
- Answer polls:
Automatically respond to "Who was the MVP of this match?" polls to receive 100 points. Enabled by default
- Answer quiz:
Automatically provide the correct answer to quizzes, such as "What does Melodie use as a weapon?" to receive 50 points. Enabled by default
- Answer slider:
Automatically slide the interactive sliders to receive 2 points. Enabled by default
- Collect lootdrop:
Automatically collect random loot drops to receive 10 points. Enabled by default
- Autopredict:
Automatically place predictions to receive 10 points (125 if prediction turns out true). Disabled by default
- - Autopredict strategy:
The strategy used for selecting the team for autopredict. Can be Blue (always choose blue), Red (always choose red), Random (randomly select) or Follow majority (pick same as the majority). Default is Follow majority
- Feed logging:
Log events (sending cheer, poll, quiz, etc) to the feed on the right side of the screen. Enabled by default
- Disable Cheer Graphics:
Disable cheer graphics to improve performance on low-end hardware. Disabled by default
- Disable Stream Player:
Disable the youtube embed from loading. Useful for bad connections or if you dont care about watching the stream. Disabled by default

## Credits

- catme0w: for developing the original [AutoBSC](https://github.com/catme0w/AutoBSC) script
- 123SONIC321: for making an improved version of the overlay UI, and other suggestions/bug reports
- Anyone else submitting suggestions/issues or just using the script

## License

MIT License
