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
        $('#recast-table tr').show();
        $('#status').text('');
        $('#unfilter .filter').show();
        $('#unfilter .unfilter').hide();
    }
}

function setValue(i, value) {
    let color = '';
    if (value === 'Ready')
        color = '#e3ea7d';
    $("#recast-table tbody tr").eq(i).find('.recast').css('color', color);
    $("#recast-table tbody tr").eq(i).find('.recast').text(value);
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

        let tr = $('<tr></tr>');
        $(tr).append(`<td class="name"><span>${recastList[i].name}</span></td>`);
        $(tr).append(`<td class="skill"><span>${recastList[i].skill}</span></td>`);
        $(tr).append(`<td class="view"><span><input type="checkbox" id="${key}"></input><label for="${key}" class="checkbox"></label></span></td>`);
        $(tr).append(`<td class="recast" style="color:#e3ea7d">${recastList[i].value}</td>`);

        if (hidden) {
            $(tr).hide();
            setFilter(hidden);
        }

        if (locked)
            $(tr).find('input[type=checkbox]').prop('checked', true);

        $('#recast-table tbody').append($(tr));
    }
}

function load(callback) {
    $('#recast-table tbody').empty();
    $.ajax({
        type: 'GET',
        url: 'https://script.google.com/macros/s/AKfycbzNYd8qbaDaUYtOo_cSSh9SKYZTdwrZaago4gm_npS38PcKRYo/exec',
        dataType: 'json',
    }).done(function (result) {
        recastList = result;
        setTable();
        // console.log('recastList', recastList);
        // console.log('recastData', recastData);
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
            setValue(idx, recastList[idx].value);

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
                                setValue(i, recastList[i].value);
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
        load();
    });

    $('#unfilter').on('click', function() {
        if (filtered) {
            config.hidden = [];
        }
        else {
            $('#recast-table tbody').find('tr').each(function(i, elem) {
                let key = $(elem).find('td.name').text() + '.' + $(elem).find('td.skill').text();
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
        $('#recast-table tbody').find('tr').each(function(i, elem) {
            if ( partyList.indexOf($(elem).find('td.name').text()) < 0) {
                let key = $(elem).find('td.name').text() + '.' + $(elem).find('td.skill').text();
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
    
    $('#recast-table thead th.sort').on('click', function() {
        $('#recast-table tbody').empty();
        var target = $(this).attr('name');
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

    $('#recast-table').on('click', 'td.skill span', function() {
        var skill = $(this).text();
        $('#recast-table tbody').find('tr').each(function(i, elem) {
            if ($(elem).is(':visible') && $(elem).find('td.skill').text() !== skill) {
                let key = $(elem).find('td.name').text() + '.' + $(elem).find('td.skill').text();
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

    $('#recast-table').on('click', 'td.name span', function() {
        let key = $(this).parents("tr").find('td.name').text() + '.' + $(this).parents("tr").find('td.skill').text();
        let locked = config.locked.indexOf(key) >= 0;
        if (!locked) {
            $(this).parents("tr").hide();
            config.hidden.push(key);
            setFilter(true);
        }
        saveConfig();
    });

    $('#recast-table').on('change', 'td.view input[type=checkbox]', function() {
        let key = $(this).parents("tr").find('td.name').text() + '.' + $(this).parents("tr").find('td.skill').text();
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