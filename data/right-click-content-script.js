self.on('click', function (node) {
  self.postMessage({
    href: node.getAttribute('href'),
    checksum: node.getAttribute('checksum')
  });
});
