# PM2 CLI Reference

This document provides a complete reference for PM2 command-line interface options and commands.

## Version Info

```
PM2 version: 6.0.13
```

## Usage

```
pm2 [cmd] app
```

## Options

### General Options

| Option | Description |
|--------|-------------|
| `-V, --version` | Output the version number |
| `-v --version` | Print pm2 version |
| `-s --silent` | Hide all messages |
| `-h, --help` | Output usage information |
| `--no-color` | Skip colors |

### Process Configuration

| Option | Description |
|--------|-------------|
| `-n --name <name>` | Set a name for the process in the process list |
| `--interpreter <interpreter>` | Set a specific interpreter (default: node) |
| `--interpreter-args <arguments>` | Arguments to pass to the interpreter |
| `--node-args <node_args>` | Space delimited arguments to pass to node |
| `-x --execute-command` | Execute a program using fork system |
| `--cwd <path>` | Run target script from path |
| `--namespace <ns>` | Start application within specified namespace |

### Logging

| Option | Description |
|--------|-------------|
| `-o --output <path>` | Specify log file for stdout |
| `-e --error <path>` | Specify log file for stderr |
| `-l --log [path]` | Specify log file which gathers both stdout and stderr |
| `--log-type <type>` | Specify log output style (raw by default, json optional) |
| `--log-date-format <date format>` | Add custom prefix timestamp to logs |
| `--time` | Enable time logging |
| `--disable-logs` | Disable all logs storage |
| `--merge-logs` | Merge logs from different instances |

### Process Management

| Option | Description |
|--------|-------------|
| `-i --instances <number>` | Launch [number] instances (load balanced) |
| `--parallel <number>` | Number of parallel actions (for restart/reload) |
| `-p --pid <pid>` | Specify pid file |
| `-k --kill-timeout <delay>` | Delay before sending final SIGKILL signal |
| `--listen-timeout <delay>` | Listen timeout on application reload |
| `--max-memory-restart <memory>` | Restart if memory is exceeded (in bytes) |
| `--restart-delay <delay>` | Specify a delay between restarts (in milliseconds) |
| `--exp-backoff-restart-delay <delay>` | Exponential backoff restart delay |
| `--max-restarts [count]` | Only restart the script COUNT times |
| `--shutdown-with-message` | Shutdown with process.send('shutdown') instead of SIGINT |
| `--stop-exit-codes <exit_codes...>` | Exit codes that should skip automatic restart |

### Watch Mode

| Option | Description |
|--------|-------------|
| `-w --watch [paths]` | Watch application folder for changes |
| `--ignore-watch <folders\|files>` | List of paths to ignore (name or regex) |
| `--watch-delay <delay>` | Restart delay after changing files |
| `--ext <extensions>` | Watch only these file extensions |

### Environment

| Option | Description |
|--------|-------------|
| `--env <environment_name>` | Specify environment variables from ecosystem file |
| `-a --update-env` | Force an update of the environment with restart/reload |
| `--filter-env [envs]` | Filter out outgoing global values |

### User/Permissions

| Option | Description |
|--------|-------------|
| `-u --user <username>` | Define user when generating startup script |
| `--uid <uid>` | Run target script with <uid> rights |
| `--gid <gid>` | Run target script with <gid> rights |

### Advanced Options

| Option | Description |
|--------|-------------|
| `-f --force` | Force actions |
| `-c --cron <cron_pattern>` | Restart based on a cron pattern |
| `-w --write` | Write configuration in local folder |
| `--no-daemon` | Run pm2 daemon in the foreground |
| `--source-map-support` | Force source map support |
| `--wait-ready` | Wait for ready event from your app |
| `--no-vizion` | Start without vizion feature (versioning control) |
| `--no-autostart` | Add an app without automatic start |
| `--no-autorestart` | Start without automatic restart |
| `--no-treekill` | Only kill the main process, not detached children |
| `--no-pmx` | Start without pmx |
| `--attach` | Attach logging after start/restart/stop/reload |
| `-m --mini-list` | Display a compacted list without formatting |
| `--sort <field_name:sort>` | Sort process according to field's name |
| `--only <application-name>` | With json declaration, only act on one application |

### Monitoring

| Option | Description |
|--------|-------------|
| `--v8` | Enable v8 data collecting |
| `--event-loop-inspector` | Enable event-loop-inspector dump in pmx |
| `--trace` | Enable transaction tracing with km |
| `--disable-trace` | Disable transaction tracing with km |
| `--deep-monitoring` | Enable all monitoring tools |

### Startup

| Option | Description |
|--------|-------------|
| `--hp <home path>` | Define home path when generating startup script |
| `--wait-ip` | Override systemd script to wait for full internet connectivity |
| `--service-name <name>` | Define service name when generating startup script |

## Commands

### Process Management

| Command | Description |
|---------|-------------|
| `start [options] [name\|namespace\|file\|ecosystem\|id...]` | Start and daemonize an app |
| `stop [options] <id\|name\|namespace\|all\|json\|stdin...>` | Stop a process |
| `restart [options] <id\|name\|namespace\|all\|json\|stdin...>` | Restart a process |
| `reload <id\|name\|namespace\|all>` | Reload processes (for HTTP/HTTPS apps) |
| `delete\|del <name\|id\|namespace\|script\|all\|json\|stdin...>` | Stop and delete a process |
| `scale <app_name> <number>` | Scale up/down a process in cluster mode |
| `reset <name\|id\|all>` | Reset counters for process |

### Process Information

| Command | Description |
|---------|-------------|
| `list\|ls` | List all processes |
| `l` | (alias) List all processes |
| `ps` | (alias) List all processes |
| `status` | (alias) List all processes |
| `jlist` | List all processes in JSON format |
| `prettylist` | Print json in prettified format |
| `describe <name\|id>` | Describe all parameters of a process |
| `desc <name\|id>` | (alias) Describe all parameters |
| `info <name\|id>` | (alias) Describe all parameters |
| `show <name\|id>` | (alias) Describe all parameters |
| `pid [app_name]` | Return pid of [app_name] or all |
| `id <name>` | Get process id by name |
| `env <id>` | List all environment variables of a process |
| `inspect <name>` | Inspect a process |

### Logging

| Command | Description |
|---------|-------------|
| `logs [options] [id\|name\|namespace]` | Stream logs file (default: all logs) |
| `flush [api]` | Flush logs |
| `reloadLogs` | Reload all logs |

### Monitoring

| Command | Description |
|---------|-------------|
| `monit` | Launch termcaps monitoring |
| `imonit` | Launch legacy termcaps monitoring |
| `dashboard\|dash` | Launch dashboard with monitoring and logs |
| `sysmonit` | Start system monitoring daemon |
| `slist\|sysinfos [options]` | List system infos in JSON |
| `monitor [name]` | Monitor target process |
| `unmonitor [name]` | Unmonitor target process |

### Daemon Management

| Command | Description |
|---------|-------------|
| `kill` | **Kill daemon** |
| `ping` | Ping pm2 daemon - if not up it will launch it |
| `updatePM2` | Update in-memory PM2 with local PM2 |
| `update` | (alias) Update in-memory PM2 with local PM2 |
| `deepUpdate` | Performs a deep update of PM2 |

### Persistence

| Command | Description |
|---------|-------------|
| `dump\|save [options]` | Dump all processes for resurrecting them later |
| `cleardump` | Create empty dump file |
| `resurrect` | Resurrect previously dumped processes |
| `startup [platform]` | Enable the pm2 startup hook |
| `unstartup [platform]` | Disable the pm2 startup hook |
| `logrotate` | Copy default logrotate configuration |

### Ecosystem

| Command | Description |
|---------|-------------|
| `ecosystem\|init [mode]` | Generate a process conf file (mode = null or simple) |
| `startOrRestart <json>` | Start or restart JSON file |
| `startOrReload <json>` | Start or gracefully reload JSON file |
| `startOrGracefulReload <json>` | Start or gracefully reload JSON file |
| `deploy <file\|environment>` | Deploy your json |

### Modules

| Command | Description |
|---------|-------------|
| `install\|module:install [options] <module\|git:/>` | Install or update a module |
| `module:update [options] <module\|git:/>` | Update a module |
| `module:generate [app_name]` | Generate a sample module |
| `uninstall\|module:uninstall <module>` | Stop and uninstall a module |
| `package [target]` | Check & Package TAR type module |
| `publish\|module:publish [options] [folder]` | Publish the module |

### Configuration

| Command | Description |
|---------|-------------|
| `set [key] [value]` | Sets the specified config |
| `multiset <value>` | Multiset eg "key1 val1 key2 val2" |
| `get [key]` | Get value for key |
| `conf [key] [value]` | Get / set module config values |
| `config <key> [value]` | Get / set module config values |
| `unset <key>` | Clears the specified config |

### PM2 Plus (Cloud Monitoring)

| Command | Description |
|---------|-------------|
| `plus\|register [options] [command] [option]` | Enable pm2 plus |
| `login` | Login to pm2 plus |
| `logout` | Logout from pm2 plus |
| `link [options] [secret] [public] [name]` | Link with pm2 monitoring dashboard |
| `unlink` | Unlink with pm2 monitoring dashboard |
| `open` | Open the pm2 monitoring dashboard |

### Version Control

| Command | Description |
|---------|-------------|
| `pull <name> [commit_id]` | Updates repository for a given app |
| `forward <name>` | Updates repository to the next commit |
| `backward <name>` | Downgrades repository to the previous commit |

### Other

| Command | Description |
|---------|-------------|
| `trigger <id\|proc_name\|namespace\|all> <action_name> [params]` | Trigger process action |
| `sendSignal <signal> <pm2_id\|name>` | Send a system signal to target process |
| `send <pm_id> <line>` | Send stdin to pm_id |
| `attach <pm_id> [comman]` | Attach stdin/stdout to application |
| `serve\|expose [options] [path] [port]` | Serve a directory over http |
| `create` | Return pid of [app_name] or all |
| `report` | Give a full pm2 report for issues |
| `examples` | Display pm2 usage examples |
| `autoinstall` | Auto install |

## Common Usage Examples

### Start an application
```bash
pm2 start app.js
pm2 start app.js --name "my-app"
pm2 start app.js -i max  # Cluster mode with max instances
```

### Monitor processes
```bash
pm2 list        # List all processes
pm2 monit       # Terminal monitoring
pm2 logs        # Stream all logs
pm2 logs app    # Stream specific app logs
```

### Manage processes
```bash
pm2 stop all           # Stop all
pm2 restart all        # Restart all
pm2 reload all         # Reload with 0-downtime
pm2 delete all         # Delete all
```

### Persistence
```bash
pm2 save               # Save current process list
pm2 resurrect          # Restore saved processes
pm2 startup            # Generate startup script
```

### Kill daemon
```bash
pm2 kill               # Kill PM2 daemon and all processes
```

## Important Notes

- Running `pm2 kill` will stop all processes and terminate the PM2 daemon
- Use `pm2 save` before `pm2 kill` if you want to preserve process list
- Use `pm2 resurrect` after PM2 daemon restarts to restore processes
- Cluster mode (`-i` flag) only works with networked applications
