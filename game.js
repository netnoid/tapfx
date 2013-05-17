/**
 * Simple FX Game
 * 
 * 遊び方
 * 1.グラフと矢印の方向が一致しているとお金が増えます
 * 2.グラフと矢印の方向が一致していないとお金が減ります
 * 3.タップで矢印を切り替えてお金をたくさんゲットしてください
 * 4.切り替えてからの時間が長いほど、お金の増減は増えます（カチカチ切り替えると損）
 * 
 * enchant.js-builds-0.7.0 : https://github.com/wise9/enchant.js
 * draw.text.js : http://d.hatena.ne.jp/nakamura001/20110430
 * 
 * 2011年に書いたgame.jsに最新のenchant.jsをあてがった状態です。
 * プラグインの仕様が微妙に変わっているようですが、詳細は確認していません。
 * 
 * 2013/05/17 netnoid@gmail.com
 */

enchant();

window.onload = function() {
    var GAMEOVER_FRAME = 2400;
    var RANDOM_VALUE = Math.random();

    var _tick = 0;
    var _money = 0.0;
    var _leverage = 1.0; // profit == gap * leverage
    var _buy = true;
    var _profitTextDelay = 0.0;

    var _background = null;
    var _graph = null;
    var _moneyText = null;
    var _profitText = null;
    var _timeText = null;
    var _touchArea = null;

    var _game = new Game(320, 320);
    _game.fps = 24;
    _game.preload('background.png', 'cursor.png');
    _game.onload = function() {
        _background = createBackGroundMap();
        _graph = createGraphGroup();
        _moneyText = createMoneyText();
        _profitText = createProfitText();
        _timeText = createTimeText();
        _touchArea = createTouchArea();

        _game.rootScene.addChild(_background);
        _game.rootScene.addChild(_graph);
        _game.rootScene.addChild(_moneyText);
        _game.rootScene.addChild(_profitText);
        _game.rootScene.addChild(_timeText);
        _game.rootScene.addChild(_touchArea);

        initGraph();
        _background.addEventListener(enchant.Event.ENTER_FRAME, mainloop);
        _touchArea.addEventListener(enchant.Event.TOUCH_START, onTouch);
    };
    _game.start();


    var initGraph = function() {
        for (var i = 0; i < _game.width / 2 + 1; ++i)
        {
            var cursor = createCursor();
            cursor.x = -_game.width / 2 - cursor.width / 2 + i;
            _graph.addChild(cursor);
        }
        _graph.lastChild.scale(1.5, 1.5);
    };

    var createBackGroundMap = function() {
        var background = new Map(32, 32);
        background.image = _game.assets['background.png'];
        var data = new Array(12);
        for (var i = 0; i < 12; ++i) {
            data[i] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
        background.loadData(data);
        return background;
    };

    var createGraphGroup = function() {
        var graph = new Group();
        graph.moveTo(_game.width / 2, _game.height / 2);
        return graph;
    };

    var createMoneyText = function() {
        return new MutableText(_game.width / 2 + 20, _game.height - 32 - 4, _game.width, '$0');
    };

    var createProfitText = function() {
        return new MutableText(_game.width / 2 + 20, _game.height / 2 - 2, _game.width, '0');
    };

    var createTimeText = function() {
        return new MutableText(_game.width / 2 + 20, _game.height - 16 - 4, _game.width, 'T100');
    };

    var createTouchArea = function() {
        return new Sprite(320, 320);
    };

    var createCursor = function() {
        var cursor = new Sprite(8, 8);
        cursor.image = _game.assets['cursor.png'];
        cursor.moveTo(-cursor.width / 2, -cursor.height / 2);
        return cursor;
    };


    var mainloop = function() {
        _tick++;

        var gap = calcGraphGap(_tick);
        scrollScreen();
        updateMoney(gap);
        updateLeverage();
        updateTimeCount(_tick);
        protGraph(gap);
        checkGameover();
    };

    var scrollScreen = function() {
        _graph.x--;
        _background.x = -32 + ((-_graph.lastChild.x % 32) | 0);
        _background.y = -32 + ((-_graph.lastChild.y % 32) | 0);
        _profitText.y = _game.height / 2 - 2 - _profitTextDelay;
    };

    var updateLeverage = function() {
        _leverage += 0.02;
        if (_leverage >= 2.0) {
            _leverage = 10.0;
        }
    };

    var updateTimeCount = function(tick) {
        var prev = getTimeCount(tick - 1);
        var next = getTimeCount(tick);
        if (prev !== next) {
            _timeText.setText('T' + next);
        }
    };

    var getTimeCount = function(tick) {
        return 100 - ((100 * tick / GAMEOVER_FRAME) | 0);
    };

    var updateMoney = function(gap) {
        var profit = caclProfit(_buy, gap, _leverage);
        _money += profit;
        _profitText.setText((profit > 0 ? '+' : '') + (profit | 0));
        _moneyText.setText('$' + (_money | 0));
    };

    var checkGameover = function() {
        if (_tick >= GAMEOVER_FRAME) {
            _game.end((_money | 0), '$' + (_money | 0));
        }
    }

    var caclProfit= function(buy, gap, leverage) {
        return ((buy ? -gap : gap) * leverage);
    };

    var protGraph = function(gap) {
        var last = _graph.lastChild;
        last.scale(1 / last.scaleX, 1 / last.scaleY);

        var first = _graph.firstChild; // recycle
        first.x = last.x + 1;
        first.y = last.y + gap;
        first.frame = _buy ? 0 : 1;

        var scale = getCursorScale(_leverage);
        first.scale(scale, scale);

        _graph.removeChild(first);
        _graph.addChild(first);
        _graph.y = _game.height / 2 - first.y;

        _profitTextDelay += gap;
        _profitTextDelay *= 0.6;

        if (caclProfit(_buy, gap, _leverage) < 0) {
            first.frame += 2; // green -> red
        }
    };

    var getCursorScale = function(leverage) {
        var scale = 1.5 + (leverage - 1) * 0.7;
        if (scale >= 2.5) {
            scale = 2.5;
        }
        return scale;
    };

    var calcGraphGap = function(tick) {
        var stage = getSatge(tick);
        var prev = calcGraphPosition(tick - 1, stage);
        var next = calcGraphPosition(tick, stage);
        return (next - prev);
    };

    var calcGraphPosition = function(tick, stage) {
        if (stage === 0) {
            var s0 = 15.0 + 7 * RANDOM_VALUE;
            return -100 * Math.sin(tick / s0) + 50 * Math.sin(tick / 45.0) + 15 * Math.sin(tick / 7.0);
        }
        if (stage === 1) {
            var s1 = 35.0 + 10 * RANDOM_VALUE;
            return 100 * Math.sin(tick / s1) - 30 * Math.sin(tick / 17.0) + 30 * Math.cos(tick / 15.0) + 7 * Math.sin(tick / 5.0);
        }
        if (stage === 2) {
            var s2 = 30.0 + 10 * RANDOM_VALUE;
            return 100 * Math.sin(tick / s2) - 70 * Math.sin(tick / 15.0) + 50 * Math.sin(tick / 11.0) + 15 * Math.sin(tick / 5.0);
        }
        return 0;
    };

    var getSatge = function(tick) {
        // easy : normal : hard == 1 : 2 : 2
        if (tick < GAMEOVER_FRAME * 0.2) { return 0; }
        if (tick < GAMEOVER_FRAME * 0.6) { return 1; }
        return 2;
    };

    var onTouch = function(e) {
        _buy = !_buy;
        _leverage = 1.0;
    };
};
