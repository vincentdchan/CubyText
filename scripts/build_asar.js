const child_process = require("child_process");
const fs = require("fs");
const path = require("path");

async function build() {
  fs.rmSync("out/asar_build", { recursive: true, force: true});
  fs.mkdirSync("out/asar_build", {recursive: true});

  const packageJson = fs.readFileSync("package.json", "utf-8");
  const packageJsonContent = JSON.parse(packageJson);
  delete packageJsonContent.devDependencies;

  fs.writeFileSync("out/asar_build/package.json", JSON.stringify(packageJsonContent, null, 2), "utf-8");
  fs.cpSync("yarn.lock", "out/asar_build/yarn.lock");

  child_process.execSync("yarn --production", {
    cwd: "out/asar_build",
    stdio: 'inherit'
  });

  ["dist", "themes"].forEach(dir => {
    fs.cpSync(dir, "out/asar_build/" + dir, {
      recursive: true
    });
  });

  console.log("run electron-packager")
  child_process.execSync("npx electron-packager ./asar_build CubyText --icon ../icons/icon.png --overwrite", {
    cwd: "out/",
    stdio: 'inherit'
  });

  if (process.platform === "darwin") {
    const appPath = path.join("out", `CubyText-${process.platform}-${process.arch}/CubyText.app`);

    const buildDir = path.join(appPath, "/Contents/Resources");
    fs.cpSync("icons/icon.icns", path.join(buildDir, "electron.icns"));
  
    await codeSign(appPath);
    await buildDmg(appPath);
  } else if (process.platform === "linux") {
    await buildDeb();
  }
}

async function codeSign(appPath) {
  const { signAsync } = require('@electron/osx-sign')
  console.log("CodeSign", appPath);
  await signAsync({
    app: appPath,
    entitlements: "./entitlements.plist",
    hardenedRuntime: true,
  })

}

async function buildDmg(appPath) {
  console.log("Build DMG", appPath);
  const createDMG = require('electron-installer-dmg');
  const parent = path.dirname(appPath);
  await createDMG({
    appPath,
    name: 'CubyText',
    out: parent,
    icon: "icons/icon.icns",
  });
}

async function buildDeb() {
  const installer = require('electron-installer-debian');
  const appPath = path.join("out", `CubyText-${process.platform}-${process.arch}`);
  const options = {
    src: appPath,
    dest: 'out/installers/',
    arch: 'amd64',
    name: "CubyText",
    bin: "CubyText",
    icon: "icons/icons.png"
  }

  console.log('Creating package (this may take a while)');
  await installer(options);
}

build();
