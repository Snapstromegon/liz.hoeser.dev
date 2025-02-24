import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import Image from "@11ty/eleventy-img";
import { basename, isAbsolute, join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { bundle, transform } from "lightningcss";

const lightningcss = (
  eleventyConfig,
  { mapDir = "assets/css", lightningOptions = {} } = {}
) => {
  const visitor = (imageHooks, eleventy) => ({
    Image: (image) => {
      const originalUrl = image.value.url;
      const outputName = `${basename(originalUrl)}.webp`;
      const outputDir = join(eleventy.directories.output, "assets/images");
      const outputUrl = join("/assets/images", outputName);
      imageHooks.push(
        Image(join(eleventy.directories.input, originalUrl.slice(1)), {
          widths: [1920],
          formats: ["webp"],
          outputDir,
          filenameFormat: function () {
            return outputName;
          },
        })
      );
      image.value.url = outputUrl.replaceAll("\\", "/");
      return image;
    },
  });

  eleventyConfig.addShortcode("lightningcss", async function (cssFile) {
    let inputPath = resolve(this.page.inputPath, cssFile);
    if (isAbsolute(cssFile)) {
      inputPath = join(this.eleventy.directories.input, cssFile.slice(1));
    }
    const imageHooks = [];
    const { code, map } = bundle({
      filename: inputPath,
      sourceMap: true,

      visitor: visitor(imageHooks, this.eleventy),
      ...lightningOptions,
    });
    await Promise.all(imageHooks);
    const mapPath = join("/", mapDir, `${basename(cssFile)}.map`);
    if (mapDir) {
      await mkdir(join("_site", mapDir), { recursive: true });
      await writeFile(
        resolve("_site", mapDir, `${basename(cssFile)}.map`),
        map
      );
    }
    return `<style>${code}/*# sourceMappingURL=${mapPath.replaceAll("\\", "/")} */</style>`;
  });

  eleventyConfig.addPairedAsyncShortcode(
    "lcss",
    async function (css) {
      const imageHooks = [];
      const { code } = transform({
        filename: `${Math.random()}.css`,
        code: Buffer.from(css),
        minify: true,
        visitor: visitor(imageHooks, this.eleventy),
        ...lightningOptions,
      });
      await Promise.all(imageHooks);
      return code.toString();
    }
  );
};

export default function (eleventyConfig) {
  eleventyConfig.addWatchTarget("src/assets/css/**/*.css");
  eleventyConfig.setInputDirectory("src");
  eleventyConfig.addPlugin(eleventyImageTransformPlugin);
  eleventyConfig.addPlugin(lightningcss);
  eleventyConfig.addFilter("niceDate", (date) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Okt",
      "Nov",
      "Dec",
    ];
    return `${date.getDate()}. ${
      months[date.getMonth()]
    } ${date.getFullYear()}`;
  });
}
