var verifications = document.getElementById('verifications');

function getFormattedDate(date) {
  return date.toString().split('.')[0];
}

self.port.on('failed_verification', function(data) {
  var div = document.createElement('div');
  div.className = 'entry fail';
  div.innerHTML = '<b>' + getFormattedDate(data.date) + '</b><br> ' + 
                  data.filename + '<br>' + data.reason;
  verifications.appendChild(div);
});

self.port.on('successful_verification', function(data) {
  var div = document.createElement('div');
  div.className = 'entry success';
  div.innerHTML = '<b>' + getFormattedDate(data.date) + '</b><br> ' + 
                  data.filename;
  verifications.appendChild(div);
});
