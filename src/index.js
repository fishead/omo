import path from 'path';
import co from 'co';
import oss from 'ali-oss';
import { version } from '../package.json';
import klaw from 'klaw';
import program from 'commander';
import chalk from 'chalk';
import fs from 'fs';


const error = chalk.red;


program.version(version);
program.usage('<cmd> [flags]');
program.option('--verbose', 'show verbose infomation');
program.option('--region <region>', 'region, valid regions: oss-cn-hangzhou');
program.option('--access-key-id <access-key-id>', 'access key id, defaults to [ALIYUN_OSS_ACCESSKEY_ID]');
program.option('--access-key-secret <access-key-secret>', 'access key secret, defaults to [ALIYUN_OSS_ACCESSKEY_SECRET]');


program
  .command('object <action> [file-or-dir]')
  .description('manage Object on OSS')
  .option('--bucket <bucket>', 'bucket to store file')
  .option('--prefix <prefix>', 'object key(or file path) prefix')
  .action(async function createResource(action, fileOrDir, options) {
    if (!program.accessKeyId && !process.env.ALIYUN_OSS_ACCESSKEY_ID) {
      return console.log(error('access key id is required'));
    }

    if (!program.accessKeySecret && !process.env.ALIYUN_OSS_ACCESSKEY_SECRET) {
      console.log(error('access key secret is required'));
    }

    if (!program.region) {
      return console.log(error('region is required'));
    }

    if (!options.bucket) {
      return console.log(error('bucket name is required'));
    }


    const store = oss({
      accessKeyId: program.accessKeyId || process.env.ALIYUN_OSS_ACCESSKEY_ID,
      accessKeySecret: program.accessKeySecret || process.env.ALIYUN_OSS_ACCESSKEY_SECRET,
      region: program.region,
      bucket: options.bucket,
    });


    const pwd = process.cwd();
    const prefix = formatPrefix(options.prefix || '');


    const _action = normalizeAction(action);


    if (_action === 'create') {
      let files = [];
      let fileRoot;


      const stats = await fileStats(fileOrDir);


      if (stats.isFile()) {
        const fullFilePath = fullPath(fileOrDir);
        fileRoot = path.dirname(fullFilePath);
        files.push(fullFilePath);
      } else if (stats.isDirectory()) {
        fileRoot = fullPath(fileOrDir);
        files = await getFilesInDir(fileRoot);
      } else {
        console.log(error('specify file or dir to upload'));
      }


      files.forEach(async filepath => {
        const fileKey = path.join(prefix, filepath.replace(fileRoot, ''));
        console.log(`upload ${filepath} to ${fileKey}`);
        const a = await co.wrap(function *() {
          return yield store.put(fileKey, filepath);
        })();
      });
    } else if (_action === 'list') {
      const res = await co.wrap(function *() {
        return yield store.list({
          prefix,
        });
      })();


      if (!res.objects) {
        return console.log(`\ntotal: 0`);
      }


      console.log(`\ntotal: ${res.objects.length}`);
      console.log(`size\tlast modified\tfile name\t`);
      res.objects.forEach(object => {
        console.log(`${object.size}\t${object.lastModified}\t${object.name}\t`);
      });
    } else if (_action === 'remove') {
      const res = await co.wrap(function *() {
        return yield store.list({
          prefix,
        });
      })();


      if (res.objects) {
        await co.wrap(function *() {
          return yield store.deleteMulti(res.objects.map(object => object.name));
        })();
      }


      console.log(chalk.green('clear'));
    } else {
      console.log(error('invalid resource type, valid resource types are: bucket, object'));
    }
  });


program.parse(process.argv);


// if program was called with no arguments, show help.
if (!program.args.length) {
  program.help();
}


function fullPath(partialPath) {
  return path.join(process.cwd(), partialPath);
}


function getFilesInDir(dir) {
  return new Promise(function(resolve, reject) {
    const files = [];
    let did = false;
    klaw(dir)
      .on('data', ({ path: filePath, stats }) => {
        if (!stats.isFile()) { return; }
        files.push(filePath);
      })
      .on('end', () => resolve(files))
      .on('error', reject);
  });
}


function trimLeadingSlash(str) {
  if (str[0] !== '/') { return str; }
  return trimLeadingSlash(str.slice(1));
}


function appendSlash(str) {
  if (str.charAt(str.length - 1) === '/') { return str; }
  return str + '/';
}


function formatPrefix(prefix) {
  return trimLeadingSlash(appendSlash(prefix));
}


function normalizeAction(action = '') {
  return action.toLowerCase();
}


function fileStats(filePath) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        return reject(err);
      }


      resolve(stats);
    });
  });
}
