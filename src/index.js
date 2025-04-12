'use strict';

(function () {
  GMEdit.register('gmedit-presence', {
    init: function (PluginState) {
      let DiscordRPC;
      let cursorPosition = {};

      try {
        DiscordRPC = require(`${PluginState.dir}/node_modules/discord-rpc`);
      } catch (err) {
        console.error('Failed to load discord-rpc module:', err);
        updateStatusBar('Error: Discord module not found');
        return;
      }

      const clientId = '1222123986914119680';
      const rpc = new DiscordRPC.Client({ transport: 'ipc' });

      let a = {
        name: 'GMEdit',
        details: 'Idling...',
        state: undefined,
        startTimestamp: new Date(),
        instance: false,
        largeImageKey: 'capsule-512',
      };

      const t = setInterval(() => {
        if (!aceEditor) return;

        let newCursorPosition = aceEditor.getCursorPositionScreen();

        if (newCursorPosition !== cursorPosition && a.state !== 'Idling...') {
          cursorPosition = newCursorPosition;
          let baseDetails =
            a.state.match(/^Working on \w+/)?.[0] ||
            a.details.split(' ').slice(0, 3).join(' ');
          a.state = `${baseDetails} ${cursorPosition.row}:${cursorPosition.column}`;
          rpc.setActivity(a);
        }
      }, 5000);

      function updateStatusBar(statusText) {
        let statusComp = document.querySelector('.ace_status-bar');
        let customStatus = document.querySelector(
          '.ace_status-bar .custom-status'
        );

        if (!statusComp) {
          console.error('Could not find .ace_status-comp');
          return;
        }

        if (!customStatus) {
          customStatus = document.createElement('span');
          customStatus.className = 'custom-status';
          statusComp.insertBefore(customStatus, statusComp.firstChild);
          console.log('Created custom status element');
        }

        customStatus.className = 'custom-status';
        customStatus.textContent = '';

        if (statusText === 'Working') {
          customStatus.classList.add('status-working');
        } else if (statusText === 'Idle') {
          customStatus.classList.add('status-idle');
        } else if (statusText.startsWith('Error')) {
          customStatus.classList.add('status-error');
          customStatus.textContent = statusText;
        }
      }

      function setupStatusObserver() {
        const statusBar = document.querySelector('.ace_status-bar');
        if (!statusBar) {
          setTimeout(setupStatusObserver, 1000);
          return;
        }

        const observer = new MutationObserver(() => {
          const customStatus = document.querySelector(
            '.ace_status-bar .custom-status'
          );
          if (!customStatus) {
            updateStatusBar(a.state ? 'Working' : 'Idle');
          }
        });

        observer.observe(statusBar, { childList: true, subtree: true });
      }

      rpc.once('ready', () => {
        console.log('Discord RPC connected successfully');
        rpc.setActivity(a);
        updateStatusBar('Idle');
        setupStatusObserver();
      });

      try {
        console.log(
          'Attempting to login to Discord RPC with clientId:',
          clientId
        );
        rpc.login({ clientId }).catch(err => {
          console.error('RPC login error:', err.message);
          updateStatusBar(`Error: ${err.message}`);
        });
      } catch (err) {
        console.error('Unexpected error during RPC login:', err);
        updateStatusBar('Error: Unexpected login failure');
      }

      GMEdit.on('projectOpen', function (e) {
        a.details = `In ${e.project.displayName}`;
        rpc
          .setActivity(a)
          .catch(err => console.error('Set activity error:', err));
        updateStatusBar('Idle');
      });

      GMEdit.on('fileOpen', function (e) {
        let newCursorPosition = aceEditor.getCursorPositionScreen();

        if (e.file.name == 'WelcomePage') {
          a.state = 'Idling...';
          updateStatusBar('Idle');
        } else {
          a.state = `Working on ${e.file.name} ${newCursorPosition.row}:${newCursorPosition.column}`;
          updateStatusBar('Working', e.file);
        }

        rpc
          .setActivity(a)
          .catch(err => console.error('Set activity error:', err));
      });

      GMEdit.on('activeFileChange', function (e) {
        let newCursorPosition = aceEditor.getCursorPositionScreen();

        if (e.file.name == 'WelcomePage') {
          a.state = 'Idling...';
          updateStatusBar('Idle');
        } else {
          a.state = `Working on ${e.file.name} ${newCursorPosition.row}:${newCursorPosition.column}`;
          updateStatusBar('Working', e.file);
        }

        rpc
          .setActivity(a)
          .catch(err => console.error('Set activity error:', err));
      });

      GMEdit.on('projectClose', function (e) {
        a.details = 'GMEdit';
        a.state = 'Idling...';
        a.startTimestamp = null;
        rpc
          .setActivity(a)
          .catch(err => console.error('Set activity error:', err));
        updateStatusBar('Idle');
      });
    },
  });
})();
