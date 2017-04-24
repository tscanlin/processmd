module.exports = {
  // The directory output will be processed to.
  outputDir: './dist',
  // Include the directory as `dir` on the resulting json objects.
  includeDir: true,
  // Include the filename (.json) as `base` on the resulting json objects.
  includeBase: true,
  // Include the extension (.json) as `ext` on the resulting json objects.
  includeExt: true,
  // Include the old filename (.md / .yml) as `oldBase` on the resulting json objects.
  includeOldBase: true,
  // Include the old extension (.md / .yml) as `oldExt` on the resulting json objects.
  includeOldExt: true,
  // Convert mode. Possible options for this are 'json' or 'source'
  convertMode: 'json'
}
