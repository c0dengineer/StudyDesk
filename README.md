# Study Desk

Study Desk is a browser-based student productivity workspace for planning daily work, managing assignments, and staying focused. It combines a task manager, subject organization, a Pomodoro-style focus timer, and progress tracking in one lightweight app.

## Features

- Create tasks quickly with natural-language details such as:
  - `#subject` for a subject
  - `!high`, `!med`, or `!low` for priority
  - `today`, `tomorrow`, weekdays, dates, or relative dates for due dates
  - Times such as `5pm` or `17:30`
  - `daily`, `weekdays`, or `weekly` recurrence
- Organize work by Today, Upcoming, All tasks, Completed, or subject.
- Add detailed task information including notes, due dates, times, priorities, recurrence, and subtasks.
- Use the focus timer with configurable focus and break durations.
- Track completed work, daily progress, focus minutes, weekly activity, and streaks.
- Search and sort tasks by smart order, due date, priority, newest, or manual order.
- Add, edit, and color-code subjects.
- Undo task changes and clear completed tasks.
- Export an account-free JSON backup and import it later.
- Switch between light and dark mode.
- Use keyboard shortcuts for common actions.
- Store all data locally in the browser with `localStorage`; no server or account is required.
- Responsive layout for desktop and mobile screens.

## Run Locally

Study Desk is a static HTML application and does not need a build step or package installation.

### Option 1: Open the file

Open `index.html` directly in a browser.

From the project directory, you can run:

```bash
$BROWSER index.html
```

### Option 2: Start a local server

A local server is useful when testing browser behavior or sharing the app on your local network.

With Python:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Project Structure

```text
.
├── index.html   # Application markup and dialogs
├── style.css    # Responsive layout, themes, components, and visual styles
├── script.js    # Task logic, timer, persistence, shortcuts, and interactions
└── README.md    # Project documentation
```

## Data and Backups

Data is saved in the browser under the `studydesk.v1` local-storage key. Clearing browser site data will remove the current workspace, so use **Export backup** before moving browsers or clearing storage. Backups are JSON files and can be restored with **Import backup**.

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `N` | Create a new task |
| `/` | Focus task search |
| `1` - `4` | Switch between Today, Upcoming, All tasks, and Completed |
| `F` | Start or pause the focus timer |
| `T` | Toggle light and dark mode |
| `Esc` | Leave the current field or close a dialog |

## Browser Support

Use a modern browser with support for JavaScript, `localStorage`, HTML dialogs, and standard CSS features. Chrome, Edge, Firefox, and Safari are recommended.
