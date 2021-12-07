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

// Main stuff.
$(function() {
    var webSocket = new ReconnectingWebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 'localhost:25000/ws/alertspolls', null, { reconnectInterval: 500 }),
        localConfigs = getQueryMap(),
        chart;

    /*
     * @function Gets a map of the URL query
     */
    function getQueryMap() {
        let queryString = window.location.search, // Query string that starts with ?
            queryParts = queryString.substr(1).split('&'), // Split at each &, which is a new query.
            queryMap = new Map(); // Create a new map for save our keys and values.

        for (let i = 0; i < queryParts.length; i++) {
            let key = queryParts[i].substr(0, queryParts[i].indexOf('=')),
                value = queryParts[i].substr(queryParts[i].indexOf('=') + 1, queryParts[i].length);

            if (key.length > 0 && value.length > 0) {
                queryMap.set(key.toLowerCase(), value);
            }
        }

        return queryMap;
    }

    /*
     * @function Used to send messages to the socket. This should be private to this script.
     *
     * @param {Object} message
     */
    const sendToSocket = function(message) {
        try {
            let json = JSON.stringify(message);

            webSocket.send(json);

            // Make sure to not show the user's token.
            if (json.indexOf('authenticate') !== -1) {
                logSuccess('sendToSocket:: ' + json.substring(0, json.length - 20) + '.."}');
            } else {
                logSuccess('sendToSocket:: ' + json);
            }
        } catch (e) {
            logError('Failed to send message to socket: ' + e.message);
        }
    };

    /*
     * @function Checks if the query map has the option, if not, returns default.
     *
     * @param  {String} option
     * @param  {String} def
     * @return {String}
     */
    const getOptionSetting = function(option, def) {
        option = option.toLowerCase();

        if (localConfigs.has(option)) {
            return localConfigs.get(option);
        } else {
            return def;
        }
    };

    /*
     * @function Used to log things in the console.
     */
    const logSuccess = function(message) {
        console.log('%c[PhantomBot Log]', 'color: #6441a5; font-weight: 900;', message);
    };

    /*
     * @function Used to log things in the console.
     */
    const logError = function(message) {
        console.log('%c[PhantomBot Error]', 'color: red; font-weight: 900;', message);
    };

    /*
     * @function Gets a random RGB color.
     *
     * @see Thanks: https://stackoverflow.com/a/10020716/8005692
     */
    const getRandomRGB = function() {
        let maximum = 255,
            minimum = 100,
            range = (maximum - minimum),
            red = (Math.floor(Math.random() * range) + minimum),
            green = (Math.floor(Math.random() * range) + minimum),
            blue = (Math.floor(Math.random() * range) + minimum);

        return 'rgb(' + red + ', ' + green + ', ' + blue + ')';
    };

    /*
     * @function Functions that creates our chart.
     *
     * @param obj The object of data
     * @param slideFrom The option where to slide it from, left, right, top, bottom.
     */
    const createChart = function(obj, title, slideFrom = 'right') {
        const scoreChart = $('.scoreChart'),
            height = $(window).height(),
            width = $(window).width();

        // Update height and stuff.
        scoreChart.height(height);
        scoreChart.width(width);

        $('.container').css({
            'margin-left': -(width / 2),
            'margin-top': -(height / 2)
        });

        // Show the chart.
        scoreChart.toggle('slide', {
            'direction': slideFrom
        }, 1e3);

        // Make the chart.
        chart = new Chart(scoreChart.get(0).getContext('2d'), getChart(obj.data, title));

        chart.update();
    };

    /*
     * @function Functions that deletes our chart.
     *
     * @param slideFrom The option where to slide it from, left, right, top, bottom.
     */
    const disposeChart = function(slideFrom = 'right') {
        $('.scoreChart').toggle('slide', {
            'direction': slideFrom
        }, 1e3, () => window.location.reload());
    };

    const getDatasets = function(data) {
        const currentDate = new Date();
        const dayOfMonth = currentDate.getDate();
        const first = [];
        const wins = [];
        const losses = [];
        const maxScore = [];
        const lastScore = [];

        for (let i = 1; i <= dayOfMonth; i++) {
            const historyEntries = data.entries
                .filter(e => new Date(e.date).getDate() === i);
            const winloss = historyEntries
                .reduce((prev, curr) => {
                    if (curr.place === 1) {
                        prev.first++;
                    } else if (curr.place <= 4) {
                        prev.win++;
                    } else {
                        prev.loss++;
                    }
                    return prev;
                }, {first: 0, win: 0, loss: 0});

            const maxScorePoints = Math.max(...historyEntries.map(e => e.currentScore + e.points));
                
            const date = `${i}.${currentDate.getMonth()}`
            first.push({x: date, y: winloss.first});
            wins.push({x: date, y: winloss.win});
            losses.push({x: date, y: winloss.loss});
            maxScore.push({x: date, y: maxScorePoints});
            
            if (historyEntries.length) {
                const lastGame = historyEntries.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
                console.log(historyEntries, lastGame);
                if (lastGame) {
                    lastScore.push({x: date, y: lastGame.currentScore + lastGame.points});
                }
            }
        }

        console.log(lastScore);
        const datasets = [{
                type: 'line',
                data: maxScore,
                backgroundColor: 'cadetblue',
                borderColor: 'cadetblue',
                borderWidth: 8,
                label: 'Max Score',
                yAxisID: 'score-axis',
            },
            {
                type: 'line',
                data: lastScore,
                backgroundColor: 'MediumSlateBlue',
                borderColor: 'MediumSlateBlue',
                borderWidth: 8,
                label: 'Score',
                yAxisID: 'score-axis',
            },
            {
                type: 'bar',
                data: losses,
                stack: 'winloss',
                backgroundColor: 'red',
                label: 'Losses',
                yAxisID: 'winloss-axis'
            },
            {
                type: 'bar',
                data: wins,
                stack: 'winloss',
                backgroundColor: 'green',
                label: 'Wins',
                yAxisID: 'winloss-axis'
            },
            {
                type: 'bar',
                data: first,
                stack: 'winloss',
                backgroundColor: 'yellow',
                label: 'First',
                yAxisID: 'winloss-axis'
            }
        ];

        return datasets;
    }

    const getChart = function(data, title = 'Stats') {
        return {
            data: {
                datasets: getDatasets(JSON.parse(data))
            },
            options: {
                responsive: true,
                tooltips: {
                    enabled: true
                },
                scales: {
                    'winloss-axis': {
                        position: 'right',
                        grid: {
                            color: getOptionSetting('font-color', 'black'),
                        },
                        ticks: {
                            color: getOptionSetting('font-color', 'black'),
                            font: { size: 20 },
                            precision: 0
                        }
                    },
                    'score-axis': {
                        position: 'left',
                        // beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: getOptionSetting('font-color', 'black'),
                            font: { size: 20 },
                            precision: 0
                        }
                    },
                    x: {
                        grid: {
                            color: getOptionSetting('font-color', 'black'),
                        },
                        ticks: {
                            color: getOptionSetting('font-color', 'black'),
                            font: { size: 20 },
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            font: { size: 25 },
                            color: getOptionSetting('font-color', 'black'),
                            padding: 25
                        },
                        position: 'top',
                    },
                    title: {
                        display: true,
                        font: { size: 35 },
                        color: getOptionSetting('font-color', 'black'),
                        text: title
                    },
                },
                layout: {
                    padding: getOptionSetting('padding', '0')
                },
            }
        }
    }

    // WebSocket events.

    /*
     * @function Called when the socket opens.
     */
    webSocket.onopen = function() {
        logSuccess('Connection established with the websocket.');

        // Auth with the socket.
        sendToSocket({
            authenticate: getAuth()
        });
    };

    /*
     * @function Socket calls when it closes
     */
    webSocket.onclose = function() {
        logError('Connection lost with the websocket.');
    };

    /*
     * @function Called when we get a message.
     *
     * @param {Object} e
     */
    webSocket.onmessage = function(e) {
        try {
            // Handle PING/PONG
            if (e.data == 'PING') {
                webSocket.send('PONG');
                return;
            }

            let rawMessage = e.data,
                message = JSON.parse(rawMessage);

            if (!message.hasOwnProperty('query_id')) {
                // Check for our auth result.
                if (message.hasOwnProperty('authresult')) {
                    if (message.authresult === 'true') {
                        logSuccess('Successfully authenticated with the socket.');
                    } else {
                        logError('Failed to authenticate with the socket.');
                    }
                } else {
                    // Handle our stats.
                    if (message.hasOwnProperty('show_stats')) { // New poll handle it.
                        createChart(message, message.title, getOptionSetting('slideFromOpen', 'right'));
                        if (message.timeout) {
                            setTimeout(() => disposeChart(getOptionSetting('slideFromClose', 'right')), message.timeout);
                        }
                    }
                }
            }
        } catch (ex) {
            logError('Error while parsing socket message: ' + ex.message);
            logError('Message: ' + e.data);
        }
    };
});
