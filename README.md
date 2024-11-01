# AutoBSC++

Want all the Starr Drops, sprays and coins, but don't have the time to watch the stream, or it just doesn't match the timezone where you live? AutoBSC++ is here to help you!

AutoBSC++ can automatically complete the events during the stream, including Cheers, Polls (choosing MVP), Quizzes, Loot Drops and Match Predictions.

Tested on Brawl Stars Championship (November 2024), but should work on other Championship streams as well.

![AutoBSC](https://github.com/LaptopCat/AutoBSC/raw/master/showcase.png)

## Quick Start

1. Install [Tampermonkey](https://www.tampermonkey.net/).

2. Install AutoBSC by clicking [here](https://github.com/LaptopCat/AutoBSC/raw/master/autobsc.user.js).

3. Open the stream page on https://event.supercell.com/brawlstars/

4. If "AutoBSC++ loaded" is shown in the event logs, then it's working. Now you can just leave the tab open and let it do the work for you.

## Differences from AutoBSC
This project is based on [AutoBSC](https://github.com/CatMe0w/AutoBSC), but has many differences from it

- AutoBSC++ has an overlay showing data and allowing you to quickly configure the script
- Quizzes are always answered correctly
- Many different ways to autopredict: always blue/red, random team or pick same as majority
- Automatically collect loot drops
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
- Low Detail Mode:
Disable cheer graphics to improve performance on low-end hardware. Disabled by default

## Known issues
- Cheers not being sent if no cheer emote selected

## License

MIT License
