var self = require("sdk/self");
var data = require("sdk/self").data;
var cm = require("sdk/context-menu");

var {Cc, Ci, Cu} = require("chrome");
Cu.import("resource://gre/modules/Downloads.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/osfile.jsm");

// Toolbar button that toggles a panel with the downlaod list.
var {ToggleButton} = require('sdk/ui/button/toggle');
var button = ToggleButton({
  id: "show-downloads-panel",
  label: "Show verified downloads",
  icon: {
    "32": "./checkmark-32.png",
    "64": "./checkmark-64.png"
  },
  onChange: function(state) {
    if (state.checked) {
      // Mark warnings as "seen".
      button.badge = null;
      button.badgeColor = null;

      downloads_panel.show({
        position: button
      });
    }
  }
});

// Panel where the downloads are displayed.
var downloads_panel = require("sdk/panel").Panel({
  contentURL: data.url("verifications.html"),
  contentScriptFile: data.url("panel-content-script.js"),
  onHide: function() {
    button.state('window', {checked: false});
  }
});

// List of supported checksum algorithms. Key represents what was specified in
// the DOM anchor, as the "checksum" attribute. The value represents the class
// of the the chosen hash, as available in the "nsICryptoHash" interface.
_SUPPORTED_CHECKSUM_ALGORITHMS = {
  SHA256: 'SHA256',
  SHA512: 'SHA512',
}

// Given an anchor's "href" attribute, return the filename.
function getFilenameFromHref(href) {
  return href.substring(href.lastIndexOf('/') + 1);
}

// Conext menu item. Only shows up when right clicking anchors with "href"
// and "checksum" attributes defined, and that are served under HTTPS.
cm.Item({
  image: self.data.url("checkmark-32.png"),
  label: "Verified Download",
  context: [
    cm.URLContext("https://*"), // This page was served with TLS.
    cm.SelectorContext('a[href]'),
    cm.SelectorContext('a[checksum]'),
      //cm.SelectorContext('a[href^="https"]') // The target has TLS.
  ],
  contentScriptFile: self.data.url("right-click-content-script.js"),
  onMessage: function(anchor) {

    function failVerification(anchor, reason) {
      // Work on the GUI panel.
      downloads_panel.port.emit('failed_verification', {
        reason: reason,
        filename: getFilenameFromHref(anchor.href),
        date: new Date()
      });
      // Work on the toolbar button.
      if (typeof button.badge === 'undefined') {
        button.badge = 1;
        button.badgeColor = 'red';
      } else {
        button.badge = button.badge + 1;
      }
    }

    function passVerification(anchor) {
      downloads_panel.port.emit("successful_verification", {
        filename: getFilenameFromHref(anchor.href),
        date: new Date()
      });
    }

    var split_checksum_attribute = anchor.checksum.split(':');
    if (split_checksum_attribute.length != 2) {
      failVerification(anchor, 'Malformed checksum attribute');
    } else {
      var anchor_checksum_algorithm = split_checksum_attribute[0].toUpperCase();
      var anchor_checksum_value = split_checksum_attribute[1];
      if (!_SUPPORTED_CHECKSUM_ALGORITHMS[anchor_checksum_algorithm]) {
        failVerification(anchor, 'Unsupported checksum algorithm');
      } else {
        downloadFile(anchor.href, function(local_file_uri) {
          var computed_checksum = computeFileChecksum(
            local_file_uri,
            _SUPPORTED_CHECKSUM_ALGORITHMS[anchor_checksum_algorithm]
          );
          if (computed_checksum != anchor_checksum_value) {
            failVerification(anchor, 'Unmatching checksums');
          } else {
            passVerification(anchor);
          }
        });
      }
    }

  },
});

/* Start processing the download of a file. Used when the context menu button
 * is clicked.
 *
 * remote_file_uri - The remote location of the to-be-downloaded file.
 * cb - Function that must be called after the file has been downloaded.
*/
function downloadFile(remote_file_uri, cb) {
  Downloads.getPreferredDownloadsDirectory().then(function(download_folder) {
    var local_file_uri = OS.Path.join(download_folder,
                                      getFilenameFromHref(remote_file_uri));
    Task.spawn(function* () {
      // Fetch a file visible in the download manager.
      let download = yield Downloads.createDownload({
          source: remote_file_uri,
          target: local_file_uri,
      });
    
      // Add it to the built-in downloads list.
      let list = yield Downloads.getList(Downloads.ALL);
      list.add(download);
    
      // Start download.
      yield Promise.all([download.start()]);
    
      cb(local_file_uri);
    });
  });
}

/* Return a file's checksum in hexadecimal format.
 * Taken from: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/
 *             Reference/Interface/nsICryptoHash
 *
 * local_file_uri - The location in the local file system of the file whose
 *                  checksum will be computed.
 * chosen_checksum_algorithm - The checksum algorithm specified in the anchor
 *                             tag, previously validated.
 *
 * Returns a hash A.K.A checksum.
*/
function computeFileChecksum(local_file_uri, chosen_checksum_algorithm) {
  var f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
  f.initWithPath(local_file_uri);
  var istream = Cc["@mozilla.org/network/file-input-stream;1"]           
                .createInstance(Ci.nsIFileInputStream);
  istream.init(f, 0x01, 0444, 0);
  var ch = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
  ch.init(ch[chosen_checksum_algorithm]);
  const PR_UINT32_MAX = 0xffffffff;
  ch.updateFromStream(istream, PR_UINT32_MAX);
  // Pass false here to get binary data back.
  var hash = ch.finish(false);
  function toHexString(charCode) {
    return ("0" + charCode.toString(16)).slice(-2);
  }
  
  // convert the binary hash data to a hex string.
  return [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
}
