import fs from 'fs';
import path from 'path';
import mjml from 'mjml';

const paths = {
  build: 'dist/emails',
  source: {
    root: 'src/emails',
    views: 'src/emails/views',
    images: 'src/emails/images'
  }
}

const config = JSON.parse(
  fs.readFileSync(
    path.resolve(
      paths.source.root,
      'config.json'
    )
  ).toString()
);

// clear previous build

if (fs.existsSync(paths.build)) {
  fs.rmdirSync(paths.build, { recursive: true });
}

config.forEach((platform) => {

  platform.hosts.forEach((host) => {

    platform.name = host.split('/').slice(1).join('');

    // create build directories

    if (!fs.existsSync(paths.build)) {
      fs.mkdirSync(paths.build);
    }

    // create host directory

    fs.mkdirSync(path.resolve(paths.build, platform.name));

    // render templates

    const templates = fs
      .readdirSync(path.resolve(paths.source.views, platform.type))
      .filter((file) => path.extname(file) === '.mjml');

    templates.forEach((file) => {
      const template = fs
        .readFileSync(path.resolve(paths.source.views, platform.type, file))
        .toString();

      const renderData = mjml(
        template,
        {
          filePath: paths.source.root
        }
      );

      for (let prop in platform.styles) {
        renderData.html = renderData.html.replace(
          RegExp(`%style.${prop}%`, 'g'),
          platform.styles[prop]
        );
      }

      fs.writeFileSync(
        `${paths.build}/${platform.name}/${path.basename(file, '.mjml')}.html`,
        renderData.html
          .replace(/%fonts%/g, path.join(host, platform.publicPath, platform.fonts))
          .replace(/%images%/g, path.join(host, platform.publicPath, platform.images))
          .replace(/%hostname%/g, platform.name)
          .replace(/%href%/g, host)
      );

    });

    // copy images

    const images = fs
      .readdirSync(path.resolve(paths.source.images))
      .filter((file) => file.search(/\.(png|jpg)$/) !== -1);

    images.length && images.forEach((image) => {
      if (!fs.existsSync(path.resolve(paths.build, platform.type, platform.images))) {
        fs.mkdirSync(path.resolve(paths.build, platform.type, platform.images));
      }
      const imageFile = fs.readFileSync(
        path.resolve(paths.source.images, image)
      );
      fs.writeFileSync(
        path.resolve(paths.build, platform.type, platform.images, image),
        imageFile
      );
    });
  });
});
