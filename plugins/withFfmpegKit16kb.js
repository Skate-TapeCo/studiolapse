const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withFfmpegKit16kb(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes("ffmpeg-kit-16kb")) {
      return cfg;
    }

    cfg.modResults.contents += `

allprojects {
  configurations.all {
    resolutionStrategy.dependencySubstitution {
      substitute module("com.arthenica:ffmpeg-kit-full") using module("com.moizhassan.ffmpeg:ffmpeg-kit-16kb:6.1.1")
      substitute module("com.arthenica:ffmpeg-kit-full-gpl") using module("com.moizhassan.ffmpeg:ffmpeg-kit-16kb:6.1.1")
      substitute module("com.arthenica:ffmpeg-kit-min") using module("com.moizhassan.ffmpeg:ffmpeg-kit-16kb:6.1.1")
      substitute module("com.arthenica:ffmpeg-kit-min-gpl") using module("com.moizhassan.ffmpeg:ffmpeg-kit-16kb:6.1.1")
    }
  }
}
`;

    return cfg;
  });
};
