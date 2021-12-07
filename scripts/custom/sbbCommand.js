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
                 * @commandpath sbb start [score] [wins] - Sets up base stats
                 */
                if (action.equalsIgnoreCase('start')) {
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

                if (action.equalsIgnoreCase('set')) {
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
                    var currentScore = $.getIniDbNumber(FILE_NAME, CURRENT_SCORE),
                        sessionPlacements = $.getIniDbString(FILE_NAME, SESSION_PLACEMENTS, ''),
                        place = parseInt(args[1]),
                        points = parseInt(args[2]);

                    var historyEntry = {
                        hero: currentHero,
                        place: place,
                        points: points,
                        currentScore: currentScore,
                        date: currentDate,
                        month: currentMonth,
                        year: currentYear
                    }

                    if (args.length >= 4 && args[3] == 'true') {
                        points += 25;
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

                    return;
                }

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
