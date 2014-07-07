// chart.js
$.ajax({
	url: '//www.google.com/jsapi',
	dataType: 'script',
	cache: true,
	success: function() {
		google.load('visualization', '1', {
			'packages': ['table', 'corechart'],
			'callback': createCharts
		});
	}
});

function createCharts() {
	retrieveUserDataAndCreateTable();
	retrieveWordDataAndCreateChart();
}

function retrieveUserDataAndCreateTable() {
	$.ajax({
		type: 'GET',
		url: '/users/summary',
		success: function(result) {
			createUserTable(result);
		}
	});
}

function createUserTable(userData) {
	var data = new google.visualization.DataTable();
	data.addColumn('string', 'Name');
	data.addColumn('number', 'Infractions');
	data.addColumn('number', '$ Owed');
	data.addColumn('number', '$ Paid');

	var rows = [];
	for (var i=0; i<userData.length; i++) {
		var row = [];
		var user = userData[i];
		row.push(user.name);
		row.push(user.totalInfractions);
		row.push(user.totalOwed);
		row.push(user.totalPaid);
		rows.push(row);
		if (rows.length == userData.length) {
			data.addRows(rows);
			var table = new google.visualization.Table(document.getElementById('userTable'));
			table.draw(data, {sortColumn:1, sortAscending:false});
		}
	}
}

function retrieveWordDataAndCreateChart() {
	$.ajax({
		type: 'GET',
		url: '/words/count',
		success: function(result) {
			createWordChart(result);
		}
	});
}

function createWordChart(wordData) {
	var data = new google.visualization.DataTable();
	data.addColumn('string', 'Word');
	data.addColumn('number', 'Use Count');
	var words = Object.keys(wordData);
	var rows = [];
	for (var i=0; i<words.length; i++) {
		var row = [];
		row.push(words[i]);
		row.push(wordData[words[i]]);
		rows.push(row);
		if (rows.length == words.length) {
			data.addRows(rows);
			var chart = new google.visualization.PieChart(document.getElementById('wordChart'));
			chart.draw(data, {title: 'Word Usage Percentages'});
		}
	}
}