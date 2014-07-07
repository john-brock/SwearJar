$(document).ready(function(){ 

	$('a[href="' + this.location.pathname + '"]').parent().addClass('active');

	$('#submit').click(function() { 
		toggleIfNotHidden($('#success'));
		toggleIfNotHidden($('#error'));
		var user = $('#userInput').val()
		$.ajax({
			type: 'POST',
			url: '/users/' + user + '/words',
			data: {
				word: $('#wordInput').val(),
				count: $('#countInput').val()
			},
			success: function(msg) {
				toggleHidden($('#success'));
				$('#userInput').prop('selectedIndex', 0);
				$('#wordInput').prop('selectedIndex', 0);
				$('#countInput').val('1');
			},
			error: function() {
				toggleHidden($('#error'));
			}
		});
	});
});

function toggleIfNotHidden(element) {
	if (!element.attr('hidden')) {
		toggleHidden(element);
	}
}

function toggleHidden(element) {
	element.attr('hidden', !element.attr('hidden'));
}