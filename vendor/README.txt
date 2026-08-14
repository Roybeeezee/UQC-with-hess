===============================================================================
  VENDOR FOLDER — two files need to go in here
===============================================================================

WHAT THIS IS FOR

The tool reads and writes Excel files using two open-source libraries. Until
now it downloaded them from the internet (Cloudflare) every time it opened.

Putting local copies in this folder means the tool works with no internet
connection at all, and never reaches out to an outside server.


-------------------------------------------------------------------------------
WHAT TO DOWNLOAD
-------------------------------------------------------------------------------

Two files. Open each link in a browser, then save the page
(Ctrl+S, or right-click -> "Save as").

  FILE 1
    Download from:
      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js

    Save into this folder as EXACTLY:
      xlsx.full.min.js

  FILE 2
    Download from:
      https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js

    Save into this folder as EXACTLY:
      exceljs.min.js

The file names must match exactly, including the ".min" part. Some browsers
add ".txt" on the end when saving - if that happens, rename the file to
remove it.


-------------------------------------------------------------------------------
HOW TO CHECK IT WORKED
-------------------------------------------------------------------------------

After adding both files, this folder should contain:

    vendor/
      README.txt          (this file)
      xlsx.full.min.js    (roughly 900 KB)
      exceljs.min.js      (roughly 800 KB)

If either file is only a few KB, the download did not work properly - it
probably saved a web page instead of the file. Try right-click -> "Save
link as" instead.

To confirm the tool is using them: disconnect from the internet, open the
tool, and load a spreadsheet. If it reads the file normally, it is running
fully offline.


-------------------------------------------------------------------------------
WHAT HAPPENS IF THIS FOLDER IS EMPTY
-------------------------------------------------------------------------------

Nothing breaks. The tool falls back to downloading the libraries from the
internet, exactly as it did before - so it still works, it just is not
offline-capable.

This means you can add these files whenever it suits you, and the tool
keeps working either way.


-------------------------------------------------------------------------------
WHEN BUILDING THE .EXE
-------------------------------------------------------------------------------

The build is already set up to include this folder (package.json lists
"vendor/**/*"), so no build settings need changing.

Upload this folder and its two files to GitHub along with everything else,
and the finished .exe will have the libraries built in.

===============================================================================
