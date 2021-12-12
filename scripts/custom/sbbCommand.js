/*
 * Copyright (C) 2016-2021 phantombot.github.io/PhantomBot
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * deathCounter.js
 *
 * A death counter.
 */

(function () {

    var FILE_NAME = 'sbb',
        CURRENT_HERO = 'currentHero',
        CURRENT_SCORE = 'currentScore',
        START_SCORE = 'startScore',
        WINS = 'wins',
        SESSION_PLACEMENTS = 'session';

    var streamTitle = null;

    var JFile = java.io.File,
        JFileInputStream = java.io.FileInputStream;

    /*
     * @function sbbUpdateFiles
     *
     * @param {String}
     */
    function sbbUpdateFiles() {
        var scoreFile = './addons/sbb/score.txt',
            placementsFile = './addons/sbb/placements.txt',
            winsFile = './addons/sbb/wins.txt',
            startScore = $.getIniDbNumber(FILE_NAME, START_SCORE, 0),
            currentScore = $.getIniDbNumber(FILE_NAME, CURRENT_SCORE, 0),
            wins = $.getIniDbNumber(FILE_NAME, WINS, 0),
            placements = $.getIniDbString(FILE_NAME, SESSION_PLACEMENTS, '');

        if (!$.isDirectory('./addons/sbb/')) {
            $.mkDir('./addons/sbb');
        }

        $.writeToFile($.lang.get('sbb.format.score', startScore, currentScore), scoreFile, false);
        $.writeToFile($.lang.get('sbb.format.placements', placements), placementsFile, false);
        $.writeToFile(wins.toFixed(0), winsFile, false);
    }

    /**
     * @function sbbGetHistory
     * 
     * @param {String} hero
     * @param {Number} month
     * @param {Number} year
     * @returns {Array} entries
     */
    function sbbGetHistory(hero, month, year) {
        var historyFile = './addons/sbb/history.txt',
            currentDate = new Date(),
            currentMonth = currentDate.getMonth(),
            currentYear = currentDate.getFullYear()

        if (!$.isDirectory('./addons/sbb/')) {
            $.mkDir('./addons/sbb');
        }

        var entries = $.readFile(historyFile)
            .map(line => JSON.parse(line));

        var total = entries.length;
        var currentTotal = entries.filter(e => e.month === currentMonth && e.year === currentYear).length;

        entries = entries.filter(e => !hero || e.hero == hero);

        if (!isNaN(month) && !isNaN(year)) {
            entries = entries.filter(e => e.month === month && e.year === year);
        }

        return {
            total: total,
            currentTotal: currentTotal,
            entries: entries
        }
    }

    /**
     * @function sbbAddHistoryEntry
     * 
     * @param {Object} entry
     */
     function sbbAddHistoryEntry(entry) {
        var historyFile = './addons/sbb/history.txt'

        if (!$.isDirectory('./addons/sbb/')) {
            $.mkDir('./addons/sbb');
        }

        $.writeToFile(JSON.stringify(entry), historyFile, true);
    }

    /**
     *@function sbbHeroStats
     *
     * @param {String} hero
     * @returns {Object} w/l global and current month
     */
    function sbbHeroStats(hero) {
        var currentDate = new Date(),
            currentMonth = currentDate.getMonth(),
            currentYear = currentDate.getFullYear(),
            history = $.sbbGetHistory(hero);

        var result = {
            totalWins: 0,
            totalLoss: 0,
            totalPickRate: 0,
            currentWins: 0,
            currentLoss: 0,
            currentPickRate: 0
        }

        history.entries.forEach(e => {
            if (e.place <= 4) {
                result.totalWins++;
                if (e.year === currentYear && e.month === currentMonth) {
                    result.currentWins++;
                }
            } else {
                result.totalLoss++;
                if (e.year === currentYear && e.month === currentMonth) {
                    result.currentLoss++;
                }
            }
        });

        result.currentPickRate = 100/(history.currentTotal + 1) * (result.currentWins + result.currentLoss + 1);
        result.totalPickRate = 100/(history.total + 1) * (result.totalWins + result.totalLoss + 1);

        return result;
    }

    function sbbPrintHeroStats(hero) {
        var stats = $.sbbHeroStats(hero),
            current = $.lang.get('sbb.format.winloss', stats.currentWins, stats.currentLoss, (stats.currentWins / stats.currentLoss).toFixed(2)),
            total = $.lang.get('sbb.format.winloss', stats.totalWins, stats.totalLoss, (stats.totalWins / stats.totalLoss).toFixed(2));

        if (hero) {
            $.say($.lang.get('sbb.stats.hero', $.lang.get('sbb.hero.' + hero), current, total, stats.currentPickRate.toFixed(0), stats.totalPickRate.toFixed(0)));
        } else {
            $.say($.lang.get('sbb.stats.global', current, total));
        }
    }

    function setStreamTitle(sender) {
        var currentHero = $.getIniDbString(FILE_NAME, CURRENT_HERO, undefined),
            currentScore = $.getIniDbNumber(FILE_NAME, CURRENT_SCORE),
            startScore = $.getIniDbNumber(FILE_NAME, START_SCORE);

        if (streamTitle) {
            if (currentHero) {
                $.updateStatus($.channelName, $.lang.get('sbb.format.title.ingame', streamTitle, $.lang.get('sbb.hero.' + currentHero), startScore, currentScore), sender, true);
            } else {
                $.updateStatus($.channelName, $.lang.get('sbb.format.title.global', streamTitle, startScore, currentScore), sender, true);
            }
        }
    }

    /**
     * @function readFileChanges
     * @param {string} path
     * @returns {Array}
     */
     function readFileChanges(path, lastOffset) {
        var result = {
            lines: [],
            position: lastOffset,
        }

        if (!fileExists(path)) {
            return result;
        }

        try {
            var fis = new JFileInputStream(path);
            fis.skip(lastOffset);
            var scan = new java.util.Scanner(fis);
            for (var i = 0; scan.hasNextLine(); ++i) {
                result.lines.push(scan.nextLine());
            }
            result.position = fis.getChannel().position();
            fis.close();
        } catch (e) {
            $.log.error('Failed to open \'' + path + '\': ' + e);
        }
        return result;
    }

    /**
     * @function fileExists
     * @export $
     * @param {string} path
     * @returns {boolean}
     */
     function fileExists(path) {
        try {
            var f = new JFile(path);
            return f.exists();
        } catch (e) {
            return false;
        }
    }

    function listenForEvents(path) {
        var initialRead = readFileChanges(path, 0),
            offset = initialRead.position;
        setInterval(() => {
            fileChanges = readFileChanges(path, offset);
            offset = fileChanges.position;
            fileChanges.lines.forEach(line => {
                if (line.includes('ActionPresentHeroDiscover')) {
                    var options = [$.lang.get('sbb.poll.options.1'), $.lang.get('sbb.poll.options.2'), $.lang.get('sbb.poll.options.3'), $.lang.get('sbb.poll.options.4')],
                        question = $.lang.get('sbb.poll.question');
                    $.poll.runPoll(question, options, 30, $.channelName, 1, function(winner) {
                        $.consoleLn($.inidb.get('pollresults', 'istie'));
                        if (winner === false) {
                            $.say($.lang.get('sbb.poll.novotes', 'Which hero should I pick?'));
                            return;
                        }
                        if ($.inidb.get('pollresults', 'istie') == 1) {
                            $.say($.lang.get('sbb.poll.tie', options[Math.round(Math.random() * 4)]));
                        } else {
                            $.say($.lang.get('sbb.poll.winner', winner));
                        }
                    });
                } else if (line.includes('ActionEnterResultsPhase')) {
                    $.consoleLn('Finished game')
                    var place = parseInt(line.match(/Placement: (\d)/)[1]),
                        points = parseInt(line.match(/RankReward: (-?\d+)/)[1]);
                        firstWinPoints = parseInt(line.match(/FirstWinOfTheDayDustReward: (\d+)/)[1])
                    $.consoleLn(place + ' ' + points + ' ' + firstWinPoints)
                    setResult(place, points, firstWinPoints, $.channelName); // TODO: Fix reward
                }
            });
        }, 2500);
    }

    function setResult(place, points, firstWinPoints, sender) {
        var currentDate = new Date(),
            currentMonth = currentDate.getMonth(),
            currentYear = currentDate.getFullYear(),
            currentHero = $.getIniDbString(FILE_NAME, CURRENT_HERO, undefined),
            currentScore = $.getIniDbNumber(FILE_NAME, CURRENT_SCORE),
            sessionPlacements = $.getIniDbString(FILE_NAME, SESSION_PLACEMENTS, '');

        var historyEntry = {
            hero: currentHero,
            place: place,
            points: points,
            currentScore: currentScore,
            date: currentDate,
            month: currentMonth,
            year: currentYear
        }

        if (firstWinPoints) {
            points += firstWinPoints;
        }

        $.sbbAddHistoryEntry(historyEntry);
        $.setIniDbNumber(FILE_NAME, CURRENT_SCORE, currentScore + points);

        sessionPlacements += (sessionPlacements.length ? ',' : '') + place;
        $.setIniDbString(FILE_NAME, SESSION_PLACEMENTS, sessionPlacements)
        if (place === 1) {
            $.setIniDbNumber(FILE_NAME, WINS, $.getIniDbNumber(FILE_NAME, WINS, 0) + 1)
        }

        $.inidb.del(FILE_NAME, CURRENT_HERO);

        $.sbbUpdateFiles();
        $.sbbPrintHeroStats();

        setStreamTitle(sender);

        var msg = JSON.stringify({
            show_stats: 'true',
            data: JSON.stringify($.sbbGetHistory(null, currentMonth, currentYear)),
            title: $.lang.get('sbb.chart.global.title'),
            timeout: 30000
        });
        $.alertspollssocket.sendJSONToAll(msg);
    }

    /*
     * @event command
     */
    $.bind('command', function (event) {
        var sender = event.getSender(),
            command = event.getCommand(),
            args = event.getArgs(),
            action = args[0],
            currentDate = new Date(),
            currentMonth = currentDate.getMonth(),
            currentYear = currentDate.getFullYear();

        /*
         * @commandpath sbb - Record history and stats of sbb matches.
         */
        if (command.equalsIgnoreCase('sbb')) {
            var currentHero = $.getIniDbString(FILE_NAME, CURRENT_HERO, undefined);
            if (action === undefined) {
                $.sbbPrintHeroStats(currentHero);
            } else {
                /*
                 * @commandpath sbb start [score] [wins] [stream-title] - Sets up base stats
                 */
                if (action.equalsIgnoreCase('start')) {

                    if (args.length < 3 || args.length > 4) {
                        $.say($.whisperPrefix(sender) + $.lang.get('sbb.usage.start'));
                        return;
                    }

                    $.inidb.del(FILE_NAME, CURRENT_HERO);
                    $.inidb.del(FILE_NAME, SESSION_PLACEMENTS);

                    var currentScore = parseInt(args[1]),
                        wins = parseInt(args[2]);
                    $.setIniDbNumber(FILE_NAME, CURRENT_SCORE, currentScore);
                    $.setIniDbNumber(FILE_NAME, START_SCORE, currentScore);

                    $.setIniDbNumber(FILE_NAME, WINS, wins);
                    $.sbbUpdateFiles();

                    if (args.length === 4) {
                        streamTitle = args[3];
                    }

                    setStreamTitle(sender);

                    $.say($.whisperPrefix(sender) + $.lang.get('sbb.start', currentScore, wins))
                    return;
                }

                 /*
                 * @commandpath sbb set [score] [wins] [stream-title] - Sets up base stats without history reset
                 */
                if (action.equalsIgnoreCase('set')) {
                    if (args.length < 3 || args.length > 4) {
                        $.say($.whisperPrefix(sender) + $.lang.get('sbb.usage.set'));
                        return;
                    }

                    var currentScore = parseInt(args[1]),
                        wins = parseInt(args[2]);

                    $.setIniDbNumber(FILE_NAME, CURRENT_SCORE, currentScore);
                    $.setIniDbNumber(FILE_NAME, WINS, wins);

                    $.sbbUpdateFiles();

                    if (args.length === 4) {
                        streamTitle = args[3];
                    }

                    setStreamTitle(sender);

                    $.say($.whisperPrefix(sender) + $.lang.get('sbb.start', currentScore, wins))
                    return;
                }

                /*
                 * @commandpath sbb hero [name] - Sets the current hero being played.
                 */
                if (action.equalsIgnoreCase('hero')) {
                    if (args.length !== 2) {
                        $.say($.whisperPrefix(sender) + $.lang.get('sbb.usage.hero'));
                        return;
                    }

                    var hero = args[1].toLowerCase();
                    if (!$.lang.get('sbb.hero.' + hero)) {
                        $.say($.whisperPrefix(sender) + $.lang.get('sbb.hero.404', hero));
                        return;
                    }

                    $.setIniDbString(FILE_NAME, CURRENT_HERO, hero);
                    $.sbbPrintHeroStats($.getIniDbString(FILE_NAME, CURRENT_HERO, undefined));

                    setStreamTitle(sender);

                    var msg = JSON.stringify({
                        show_stats: 'true',
                        data: JSON.stringify($.sbbGetHistory(hero, currentMonth, currentYear)),
                        title: $.lang.get('sbb.chart.hero.title', $.lang.get('sbb.hero.' + hero)),
                        timeout: 30000
                    });
                    $.alertspollssocket.sendJSONToAll(msg);

                    return;
                }

                /*
                 * @commandpath sbb result [place] [points] <first-win> - Records a match and resets the current hero
                 */
                if (action.equalsIgnoreCase('result')) {
                    if (args.length < 3 || args.length > 4) {
                        $.say($.whisperPrefix(sender) + $.lang.get('sbb.usage.result'));
                        return;
                    }

                    var place = parseInt(args[1]),
                        points = parseInt(args[2]);

                    if (place < 1 || place > 8) {
                        $.say($.whisperPrefix(sender) + $.lang.get('sbb.usage.result'));
                        return;
                    }

                    setResult(place, points, (args.length >= 4 && args[3] == 'true') ? 25 : 0, sender);

                    return;
                }

                 /*
                 * @commandpath sbb stats - Triggers stat overlay to show
                 */
                if (action.equalsIgnoreCase('stats')) {
                    var msg = JSON.stringify({
                        show_stats: 'true',
                        data: JSON.stringify($.sbbGetHistory(null, currentMonth, currentYear)),
                        title: $.lang.get('sbb.chart.global.title'),
                        timeout: 30000
                    });
                    $.alertspollssocket.sendJSONToAll(msg);
                }
            }
        }
    });

    /*
     * @event initReady
     */
    $.bind('initReady', function () {
        $.registerChatCommand('./custom/sbbCommand.js', 'sbb', 7);

        $.registerChatSubcommand('sbb', 'start', 2);
        $.registerChatSubcommand('sbb', 'hero', 2);
        $.registerChatSubcommand('sbb', 'result', 2);
        $.registerChatSubcommand('sbb', 'stats', 2);
        $.registerChatSubcommand('sbb', 'set', 2);

        // Uncomment next line and put the url to your Player log file below to activate log parsing
        // listenForEvents("C:\\Users\\<username>\\AppData\\LocalLow\\Good Luck Games\\Storybook Brawl\\Player.log")
        setInterval(function () {
            sbbUpdateFiles();
        }, 10000);
    });

    /*
     * Export functions to API
     */
    $.sbbUpdateFiles = sbbUpdateFiles;
    $.sbbPrintHeroStats = sbbPrintHeroStats;
    $.sbbGetHistory = sbbGetHistory;
    $.sbbHeroStats = sbbHeroStats;
    $.sbbAddHistoryEntry = sbbAddHistoryEntry;
})();
