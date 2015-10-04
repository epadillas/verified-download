# verified-download
Firefox extension that verifies the integrity of files downloaded via anchor tags

Look at the demo here: http://epadillas.com/2015/10/01/On-insecure-software-distribution-practices.html#extension


### 1. Introduction
One important characteristic of websites is that they act as a platform for downloading files. The integrity of those files needs to be verified in order to make sure that they weren't tampered with or corrupted in transfer. Currently, there's no standard method for securely allowing web-browser users to verify downloads.
The lack of said standard method has forced webmasters to come up with non-standard methods of providing verification mechanisms for files downloaded from HTML documents they have authored.
One of these non-standard methods consists of providing the expected file checksum as a visible element in the DOM. Another one consists of providing a hyper-link to a document hosted in an external server, where the file's checksum will be available.
These non-standard methods require the end-users to perform a series of extra steps that could deter their willingness to validate downloads: they need to locate the expected checksum, compute the checksum of the downloaded file, and compare the expected and computed checksums. Also, when incorrectly implemented (e.g., making the file or its checksum available without TLS), these methods can give a false sense of security.
This memo suggests a mechanism to safeguard web-browser users from unverifiable downloads, and to allow webmasters to provide verification security for the files directly from their HTML documents.

### 2. The CHECKSUM Attribute for HTML Anchor Tags
This attribute's value string must follow this format: the algorithm that was used to compute the file's checksum, followed by the colon character, followed the file's checksum. The chosen checksum algorithm must be supported by the users' web-browser.


### 3. Usage
This section explains how to use this memo's recommendations to verify the integrity of files downloaded via anchor elements with a CHECKSUM attribute.


#### 3.1. Integrity Verification Scenarios
If the HTML document containing the anchor element is not served under HTTPS, or if the anchor element does not have a checksum attribute defined, the verification must not be offered as an option by the web-browser.

When the HTML document containing the anchor element is served under HTTPS, and when the checksum attribute is defined, the following scenarios are possible:

- The checksum attribute is invalid or malformed. The download must not be carried out and the verification must fail immediately. A malformed checksum attribute is any attribute that does not follow the format specified in Section 2 of this memo (“The CHECKSUM Attribute for HTML Anchor Tags”).
- The checksum attribute is valid, but the chosen algorithm is not supported by the web-browser. The download must not be carried out and the verification must fail immediately.
- The checksum attribute is valid and the chosen algorithm is supported by the web-browser. The download is carried out, but the provided checksum is different than the one computed from the downloaded file. The verification must fail in this case.
- The checksum attribute is valid and the chosen algorithm is supported by the web-browser. The download is carried out, and the provided checksum is identical to the one computed from the downloaded file. This is the only case in which the verification must pass.

#### 3.2. Example HTML Code

These are valid examples, where the verification option must be offered by the web-browser, assuming that this HTML code was served under HTTPS.

```
<a href=”http://example.org/important.doc” checksum=”sha256:084c799cd551dd1d8d5c5f9a5d593b2e931f5e36122ee5c793c1d08a19839cc0”>
Click to download
</a>

<a href=”installer.sh” checksum=”sha512:65f61ced21494aeaa7f9f2bb439d37df97f6ba2394da57f215e7ffd457f647e478532174a9406e8519b2444ad85aba2f8a47edcb8bff8419ff0083bd9a9a1274”>
Click to download
</a>
```

#### 4. Suggested Web-Browser Behaviour
To keep the web-browsers' User-Experience as unchanged as possible, it is suggested that an extra context-menu item is implemented, titled “Verified Download”, that will be shown when the end-user right-clicks a valid HTML anchor tag with a CHECKSUM attribute. If this new context-menu item is clicked, the web-browser will behave as stated in section 3.1 of this memo (“Integrity Verification Scenarios”). Visual feedback will let the user know if the verification was successful or not. If the verification failed, the reason for this failure must be shown.

#### 5. Security Considerations
The HTML document containing any anchor element with the CHECKSUM attribute must be served under HTTPS. Otherwise, an attacker could modify the attribute's value and a tampered file could be seen as authentic. Checksum algorithms known to be vulnerable to collisions must be avoided (e.g., MD5, SHA1SUM)

