//

var recastList = [];
var recastData = {};
var intervalId = null;
var filtered = false;

var storage = localStorage;
var config = JSON.parse(storage.getItem('recasttimer_config'));
if (config===null) {
    console.log('Config init');
    config = {
        hidden: [],
    };
    storage.setItem('recasttimer_config', JSON.stringify(config));
}

function saveConfig() {
    storage.setItem('recasttimer_config', JSON.stringify(config));
}
// ;

function setValue(i, value) {
    let color = '';
    if (value === 'Ready')
        color = '#e3ea7d';
    $("#recast-table tbody tr").eq(i).find('.recast').css('color', color);
    $("#recast-table tbody tr").eq(i).find('.recast').text(value);
}

function reload() {
    $('#recast-table tbody').html('');

    $.ajax({
        type: 'GET',
        url: 'https://script.google.com/macros/s/AKfycbzNYd8qbaDaUYtOo_cSSh9SKYZTdwrZaago4gm_npS38PcKRYo/exec',
        dataType: 'json',
    }).done(function (result) {
        recastList = result;
        for (let i in recastList) {
            let key = `${recastList[i].name}.${recastList[i].skill}`;
            let hidden = config.hidden.indexOf(key) >= 0;
            console.log(key);
            console.log(key in config.hidden);
            recastData[key] = i;
            recastList[i].value = 'Ready';
            recastList[i].lasttime = null;
    
            let tr = $('<tr></tr>');
            $(tr).append(`<td class="name"><span>${recastList[i].name}</span></td>`);
            $(tr).append(`<td class="skill"><span>${recastList[i].skill}</span></td>`);
            $(tr).append(`<td class="recast" style="color:#e3ea7d">${recastList[i].value}</td>`);

            if (hidden) {
                tr.hide();
                $('#status').text('filtered');
            }

            $('#recast-table tbody').append($(tr));
        }
    
        console.log('recastList', recastList);
        console.log('recastData', recastData);
    
    }).fail(function (result) {
        console.log(result);
    });
}
addOverlayListener('LogLine', (data) => {
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
        reload();
    });

    $('#unfilter').on('click', function() {
        $('#recast-table tr').show();
        $('#status').text('');
        config.hidden = [];
        saveConfig();
        filtered = false;
    });
    
    $('#recast-table').on('click', 'td.name span', function() {
        $(this).parents("tr").hide();
        let key = $(this).parents("tr").find('td.name').text() + '.' + $(this).parents("tr").find('td.skill').text();
        config.hidden.push(key);
        saveConfig();
        filtered = true;
        $('#status').text('filtered');
    });

    $('#recast-table').on('click', 'td.skill span', function() {
        var skill = $(this).text();
        $('#recast-table tbody').find('tr').each(function(i, elem) {
            if ($(elem).find('td.skill').text() !== skill) {
                $(elem).hide()
                let key = $(elem).find('td.name').text() + '.' + $(elem).find('td.skill').text();
                config.hidden.push(key);
                filtered = true;
            }
        });
        if (filtered) {
            saveConfig();
            $('#status').text('filtered');
        }
    });

    $.ajax({
        type: 'GET',
        url: 'https://script.google.com/macros/s/AKfycbzNYd8qbaDaUYtOo_cSSh9SKYZTdwrZaago4gm_npS38PcKRYo/exec',
        dataType: 'json',
    }).done(function (result) {
        recastList = result;
        recastData = {};
        for (let i in recastList) {

            let key = `${recastList[i].name}.${recastList[i].skill}`;
            let hidden = config.hidden.indexOf(key) >= 0;
            recastData[key] = i;
            recastList[i].value = 'Ready';
            recastList[i].lasttime = null;
    
            let tr = $('<tr></tr>');
            $(tr).append(`<td class="name"><span>${recastList[i].name}</span></td>`);
            $(tr).append(`<td class="skill"><span>${recastList[i].skill}</span></td>`);
            $(tr).append(`<td class="recast" style="color:#e3ea7d">${recastList[i].value}</td>`);

            if (hidden) {
                tr.hide();
                $('#status').text('filtered');
            }

            $('#recast-table tbody').append($(tr));
        }
    
        console.log('recastList', recastList);
        console.log('recastData', recastData);
    
        startOverlayEvents();
    
    }).fail(function (result) {
        console.log(result);
    });
})

//Elm Earhartの「テレポ」