var greenBackgroundClass = 'green-background';
var greenClass = 'green';
var boldClass = 'bold';
var ids = [];
var words = {};

$(document).ready(function(){ 

	$('a[href="' + this.location.pathname + '"]').parent().addClass('active');

	$('#submit').click(function() { 
		toggleIfNotHidden($('#success'));
		toggleIfNotHidden($('#error'));
		submitBulk();
	});

	$('#submitOld').click(function() { 
		toggleIfNotHidden($('#success'));
		toggleIfNotHidden($('#error'));
		submitForm();
	});

	$('#decrement').click(function() { 
		adjustCount(-1);
	});

	$('#increment').click(function() { 
		adjustCount(1);
	});

	$('#signup').click(function() {
		signup();
	});

	$('button[class$="user"]').click(function() {
		var userId = this.getAttribute('data-user');
		var idPosition = ids.indexOf(userId);
		var check = $('#'+userId+'_check');
		if (idPosition >= 0) {
			ids.splice(idPosition, 1);
			adjustUserClasses($('#'+this.id), check, false);
		} else {
			ids.push(userId);
			adjustUserClasses($('#'+this.id), check, true);
		}
	});

	$('button[class$="word"]').click(function() {
		var word = this.getAttribute('data-word');
		var badge = $('#'+word+'_badge');
		var value = parseInt(badge.attr('value')) + 1;
		words[this.getAttribute('data-word-full')] = value;
		badge.attr('value', value);
		badge.text(value);
		adjustWordClasses($('#'+this.id), badge, value);
	})

	adjustDefaultSelectValue('#userInput');
	adjustDefaultSelectValue('#wordInput');
	adjustDefaultSelectValue('#teamInput');
});

function toggleIfNotHidden(element) {
	if (!element.attr('hidden')) {
		toggleHidden(element);
	}
}

function toggleHidden(element) {
	element.attr('hidden', !element.attr('hidden'));
}

function adjustUserClasses(button, checkbox, isChecked) {
	if (isChecked) {
		button.addClass(greenClass);
		button.addClass(boldClass);		
		checkbox.removeClass('glyphicon-unchecked');
		checkbox.addClass('glyphicon-check');
	} else {
		button.removeClass(greenClass);
		button.removeClass(boldClass);
		checkbox.removeClass('glyphicon-check');
		checkbox.addClass('glyphicon-unchecked');
	}
}

function adjustWordClasses(button, badge, value) {
	var hasClass = badge.hasClass(greenBackgroundClass);
	if (value >= 1) {
		if (!hasClass) {
			button.addClass(greenClass);
			button.addClass(boldClass);
			badge.addClass(greenBackgroundClass);
		}
	} else {
		if(hasClass) {
			button.removeClass(greenClass);
			button.removeClass(boldClass);
			badge.removeClass(greenBackgroundClass);
		}
	}
}

function clearAllValues() {
	$('button[id$="_user_btn"]').each(function(index) {
		var userButton = $(this);
		userButton.removeClass(greenClass);
		userButton.removeClass(boldClass);
	});
	$('button[id$="_word_btn"]').each(function(index) {
		var wordButton = $(this);
		wordButton.removeClass(greenClass);
		wordButton.removeClass(boldClass);
	});
	$('span[id$="_badge"]').each(function(index) {
		var badge = $(this);
		badge.removeClass(greenBackgroundClass);
		badge.attr('value', 0);
		badge.text(0);
	});
	$('span[id$="_check"]').each(function(index) {
		var checkbox = $(this);
		checkbox.removeClass('glyphicon-check');
		checkbox.addClass('glyphicon-unchecked');
	});
}

function submitForm() {
	var user = $('#userInput').val();
	var word = $('#wordInput').val();
	var count = $('#countInput').val();
	submit(user, word, count, function(err) {
		if (err) {
			error();
		} else {
			success();
			adjustDefaultSelectValue('#userInput');
			adjustDefaultSelectValue('#wordInput');
			$('#countInput').val('1');
		}
	})
}

function adjustCount(adjustment) {
	var count = $('#countInput').val();
	$('#countInput').val(+count + adjustment);
}

function signup() {
	var team = $('#team').val();
	if (!verifyTeamName(team)) {
		$('#badTeamName').show();
		return;
	}
	$.ajax({
		type: 'POST',
		url: '/users/signup',
		data: {
			'team' : team
		},
		success: function(msg) {
			window.location = "/";
		},
		error: function() {
			// should handle error better with user message
			window.location = "/signup";
		}
	});
}

function verifyTeamName(name) {
	var pattern = new RegExp("^[a-zA-Z0-9_-]*$");
	var matches = pattern.test(name);
	console.log(matches)
	return matches;
}

function submitBulk() {
	var userCount = 0;
	var successCount = 0;
	var errorCount = 0;
	for (var index in ids) {
		var user = ids[index];
		var keys = Object.keys(words);
		var wordCount = 0;
		for (var key in keys) {
			var word = keys[key];
			var count = words[word];
			submit(user, word, count, function(err) {
				if (err) {
					errorCount++;
				} else {
					successCount++;
				}
				if ((errorCount + successCount) == (ids.length * keys.length)) {
					if (errorCount > 0) {
						error();
					}
					if (successCount > 0) {
						success();
					}
					clearAllValues();
				}
			});
		}
	}
}

function submit(user, word, count, callback) {
	$.ajax({
		type: 'POST',
		url: '/users/' + user + '/words',
		data: {
			word: word,
			count: count
		},
		success: function(msg) {
			callback(null);
		},
		error: function() {
			callback(true);
		}
	});
}

function success() {
	toggleHidden($('#success'));
}

function error() {
	toggleHidden($('#error'));
}

function adjustDefaultSelectValue(selectId) {
	var selectInput = $(selectId);
	var selectOptions = selectInput.prop('options');
	if (null != selectOptions) {
		if (selectInput.prop('options').length == 2) {
			// length of 2 means there is only 1 real option
			selectInput.prop('selectedIndex', 1);
		} else {
			selectInput.prop('selectedIndex', 0);		
		}
	}
}
