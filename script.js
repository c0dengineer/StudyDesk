$(document).ready(function () {
    // Add task
    $('#addBtn').click(function () {
      const taskText = $('#taskInput').val().trim();
      if (taskText !== '') {
        const newTask = $(`<li>${taskText} <span class="remove-btn">✖</span></li>`);
        $('#taskList').append(newTask.hide().fadeIn());
        $('#taskInput').val('');
      }
    });
  
    // Toggle task completion using event delegation
    $('#taskList').on('click', 'li', function () {
      $(this).toggleClass('completed');
    });
  
    // Remove task using event delegation
    $('#taskList').on('click', '.remove-btn', function (e) {
      e.stopPropagation(); // Prevent triggering the li click
      $(this).parent().fadeOut(function () {
        $(this).remove();
      });
    });
  });
  