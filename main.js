//

var recastList = [];
var recastData = {};
var intervalId = null;
var filtered = false;

var partyList = [];
var myName = '';

var storage = localStorage;
var config = JSON.parse(storage.getItem('recasttimer_config'));

var order = {
    name: 1,
    skill: 1,
    lock: 1,
}

if (config===null) {
    console.log('Config init');
    config = {
        hidden: [],
        locked: [],
    };
    saveConfig();
}

if (!config.hidden) {
    config.hidden = [];
    saveConfig();
}

if (!config.locked) {
    config.locked = [];
    saveConfig();
}

function saveConfig() {
    storage.setItem('recasttimer_config', JSON.stringify(config));
}

function setFilter(f) {
    filtered = f;
    if (filtered) {
        $('#status').text('filtered');
        $('#unfilter .filter').hide();
        $('#unfilter .unfilter').show();
    }
    else {
        $('.table .row').show();
        $('#status').text('');
        $('#unfilter .filter').show();
        $('#unfilter .unfilter').hide();
    }
}

function setValue(i, value, recast) {
    let color = '';
    let _v = value;
    if (value === 'Ready') {
        color = '#e3ea7d';
        _v = 0;
        $(".table .tbody .row").eq(i).find('.bar').css('transition', '');
    }
    else {
        _v -= 1;
    }
    
    if (_v == recast -1)
        $(".table .tbody .row").eq(i).find('.bar').css('width', '100%');

    if (_v == recast -1)
        $(".table .tbody .row").eq(i).find('.bar').css('transition', 'width 1.0s linear');

    //console.log(i, _v, recast -1);
    $(".table .tbody .row").eq(i).find('.bar').css('width', `${_v / recast * 100}%`);
    $(".table .tbody .row").eq(i).find('.recast').css('color', color);
    $(".table .tbody .row").eq(i).find('.recast').text(value);
}

function setTable() {
    recastData = {};
    for (let i in recastList) {
        let key = `${recastList[i].name}.${recastList[i].skill}`;
        let hidden = config.hidden.indexOf(key) >= 0;
        let locked = config.locked.indexOf(key) >= 0;
        
        recastData[key] = i;
        recastList[i].value = 'Ready';
        recastList[i].lasttime = null;
        
        let div = $('<div class="row"></div>');
        let alpha = '50';
        if (recastList[i].alpha) {
            let temp = ( '00' + recastList[i].alpha ).slice( -2 );
            if (/^[0-9A-Fa-f]{2}$/.test(temp))
                alpha = temp;
        }
        
        //console.log(alpha);
        $(div).append(`<div class="inbox bar" style="background-color:${recastList[i].color}${alpha}"></div>`);

        let val = $('<div class="inbox val">');
        $(val).append(`<div class="name"><span>${recastList[i].name}</span></div>`);
        $(val).append(`<div class="skill"><span>${recastList[i].skill}</span></div>`);
        $(val).append(`<div class="lock"><span><input type="checkbox" id="${key}"></input><label for="${key}" class="checkbox"></span></label></div>`);
        $(val).append(`<div class="recast" style="color:#e3ea7d">${recastList[i].value}</div>`);
        
        $(div).append(val);

        if (hidden) {
            $(div).hide();
            setFilter(hidden);
        }

        if (locked)
            $(div).find('input[type=checkbox]').prop('checked', true);

        $('.table .tbody').append($(div));
    }
}

function load(callback) {
    $('.table .tbody').empty();
    $.ajax({
        type: 'GET',
        url: 'https://script.google.com/macros/s/AKfycbzNYd8qbaDaUYtOo_cSSh9SKYZTdwrZaago4gm_npS38PcKRYo/exec',
        dataType: 'json',
    }).done(function (result) {
        recastList = result;
        setTable();
        console.log('recastList', recastList);
        console.log('recastData', recastData);
        if (callback)
            callback()

    }).fail(function (result) {
        console.log(result);
    });
}

window.addOverlayListener('ChangePrimaryPlayer', (data) => {
    myName = data.charName;
    if (partyList.indexOf(myName) < 0)
        partyList.push(myName);

    console.log(partyList);
});

window.addOverlayListener('PartyChanged', (data) => {
    partyList = [];
    console.log(data);
    if (data.party.length === 0) {
        if (myName !== '')
            partyList.push(myName);
    }
    else {
        for (let i in data.party) {
            partyList.push(data.party[i].name);
        }
    }

    console.log(partyList);
});

window.addOverlayListener('LogLine', (data) => {
    //["00", "2020-12-05T20:37:02.0000000+09:00", "082b", "", "Elm Earhartの「迅速魔」"
    if (data.line[0] === '00') {
        let info = data.line[4].match(/(.+?)の「(.+?)」/);
        if (!info)
            return;
        let key = `${info[1]}.${info[2]}`;
        if (key in recastData) {
            console.log(info);
            let idx = recastData[key];

            recastList[idx].lasttime = new Date().getTime();
            recastList[idx].value = recastList[idx].recast;
            setValue(idx, recastList[idx].value, recastList[idx].recast);

            if (intervalId === null) {
                intervalId = setInterval(() => {
                    let time = new Date().getTime();
                    let allReady = true;

                    for (let i in recastList) {
                        if (recastList[i].value !== 'Ready') {
                            allReady = false;
                            
                            if (recastList[i].lasttime < time - 1000) {
                                recastList[i].value--;
                                if (recastList[i].value <= 0)
                                    recastList[i].value = 'Ready';
                                setValue(i, recastList[i].value, recastList[i].recast);
                                recastList[i].lasttime = time;
                            }
                        }
                    }
                    
                    if (allReady) {
                        console.log('Clear Interval ' + intervalId);
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                }, 10);

                console.log('Start Interval ' + intervalId);
            }
            console.log("In list", recastList[idx]);
        }
    }
});

$(function () {
    $('#reload').on('click', function() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
        load();
    });

    $('#unfilter').on('click', function() {
        if (filtered) {
            config.hidden = [];
        }
        else {
            $('.table').find('.row').each(function(i, elem) {
                let key = $(elem).find('.name').text() + '.' + $(elem).find('.skill').text();
                let locked = config.locked.indexOf(key) >= 0;
                if (!locked) {
                    $(elem).hide();
                    config.hidden.push(key);
                }
            });
        }
        filtered = !filtered;
        saveConfig();
        setFilter(filtered);
    });

    $('#party-filter').on('click', function() {
        $('.table .tbody').find('.row').each(function(i, elem) {
            if ( partyList.indexOf($(elem).find('.name').text()) < 0) {
                let key = $(elem).find('.name').text() + '.' + $(elem).find('.skill').text();
                let locked = config.locked.indexOf(key) >= 0;
                if (!locked) {
                    $(elem).hide();
                    config.hidden.push(key);        
                    setFilter(true);
                }
            }
        });
        saveConfig();
    });
    
    $('.table .thead').on('click', '.sort label', function() {
        $('.table .tbody').empty();
        var target = $(this).parents('.sort').attr('name');
        var orderStr = '';

        if (target !== 'lock') {
            recastList.sort((a, b) => {
                if (a[target] < b[target]) return -1 * order[target];
                if (a[target] > b[target]) return 1 * order[target];
                return 0;
            });
        }
        else {
            recastList.sort((a, b) => {
                let akey = `${a.name}.${a.skill}`;
                let bkey = `${b.name}.${b.skill}`;
                let alocked = config.locked.indexOf(akey) >= 0;
                let blocked = config.locked.indexOf(bkey) >= 0;
                if (alocked && !blocked) return -1 * order[target];
                if (!alocked && blocked) return 1 * order[target];
                return 0;
            });
        }

        if (order[target] === 1) {
            orderStr = '↑';
            $(this).find('span').css('color', 'cyan');
        }
        else {
            orderStr = '↓';
            $(this).find('span').css('color', 'darkorange');
        }
        $(this).find('span').text(orderStr);
        order[target] *= -1;
        setTable();
    });

    $('.table .tbody').on('click', '.skill span', function() {
        var skill = $(this).text();
        $('.table .tbody').find('.row').each(function(i, elem) {
            if ($(elem).is(':visible') && $(elem).find('.skill').text() !== skill) {
                let key = $(elem).find('.name').text() + '.' + $(elem).find('.skill').text();
                let locked = config.locked.indexOf(key) >= 0;
                if (!locked) {
                    $(elem).hide()
                    config.hidden.push(key);
                    setFilter(true);
                }
            }
        });
        saveConfig();
    });

    $('.table .tbody').on('click', '.name span', function() {
        let key = $(this).parents(".row").find('.name').text() + '.' + $(this).parents(".row").find('.skill').text();
        let locked = config.locked.indexOf(key) >= 0;
        if (!locked) {
            $(this).parents(".row").hide();
            config.hidden.push(key);
            setFilter(true);
        }
        saveConfig();
    });

    $('.table .tbody').on('change', '.lock input[type=checkbox]', function() {
        let key = $(this).parents(".row").find('.name').text() + '.' + $(this).parents(".row").find('.skill').text();
        if ($(this).prop('checked')) {
            config.locked.push(key);
        }
        else {
            let i = config.locked.indexOf(key);
            if(i >= 0)
                config.locked.splice(i, 1);
        }
        saveConfig();
    });

    load(() => {
        console.log("START");
        startOverlayEvents();
    });
})

//Elm Earhartの「テレポ」