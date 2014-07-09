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
	data.addColumn('number', 'Count');
	data.addColumn('number', '$ Owed');
	data.addColumn('number', '$ Paid');

	var summaryData = new google.visualization.DataTable();
	var rows = [];
	count = 0;
	for (var i=0; i<userData.length; i++) {
		count++;
		var row = [];
		var user = userData[i];
		if (user.name === 'Total') {
			summaryData.addColumn('string', user.name);
			summaryData.addColumn('number', user.totalInfractions);
			summaryData.addColumn('number', user.totalOwed);
			summaryData.addColumn('number', user.totalPaid);
		} else {
			row.push(user.name);
			row.push(user.totalInfractions);
			row.push(user.totalOwed);
			row.push(user.totalPaid);
			rows.push(row);
		}
		if (count == userData.length) {
			data.addRows(rows);
			data.sort([{column:1, desc:true}]);
			var table = new google.visualization.Table(document.getElementById('userTable'));
			table.draw(data, {sort:'disable'});
			var summaryTable = new google.visualization.Table(document.getElementById('summaryTable'));
			summaryTable.draw(summaryData, null);
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