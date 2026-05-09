# SABnzbd for Homey

Control and monitor your [SABnzbd](https://sabnzbd.org) usenet download manager from Homey. Get notified when downloads finish, pause or resume downloading based on time or other conditions, and build flows around your download activity.

## Features

### Device monitoring

Each SABnzbd instance is added as a Homey device that continuously reports:

- **Downloading** (on/off) — Toggle to instantly pause or resume SABnzbd
- **Download Speed** — Current speed in MB/s
- **Status** — `idle`, `downloading`, `paused`, or `error`
- **Queue Size** — Remaining data to download in MB
- **Queue Items** — Number of items in the queue

### Flow triggers

- **A download completed** — Fires when an individual download finishes successfully. Provides the download name as a flow token.
- **Queue became empty** — Fires when the last item in the queue finishes and SABnzbd goes idle.
- **Status changed** — Fires whenever the status changes between idle, downloading, paused, or error. Provides the new status as a flow token.

### Flow conditions

- **Queue is paused** — True when SABnzbd is paused.
- **Is actively downloading** — True when SABnzbd is actively downloading.
- **Download speed is above X MB/s** — True when the current speed exceeds the given value.
- **Download speed is below X MB/s** — True when the current speed is under the given value.
- **Queue size is above X GB** — True when the remaining queue exceeds the given size.

### Flow actions

- **Pause downloading** — Pause all downloading.
- **Resume downloading** — Resume downloading.
- **Set speed limit** — Throttle download speed to a given MB/s. Set to 0 for unlimited.
- **Add NZB by URL** — Send an NZB URL directly to SABnzbd's download queue.

## Setup

1. Open **Homey** → **More** → **Apps** → **SABnzbd** → **Add device**
2. Enter the full URL of your SABnzbd instance, including scheme and port — e.g. `http://192.168.1.100:8080`
3. Enter your SABnzbd **API key** (found in SABnzbd → Config → General)
4. Click **Test connection**, then **Add device**

Multiple SABnzbd instances can be added as separate devices.

### Device settings

- **URL** — Full SABnzbd URL (http or https)
- **API Key** — SABnzbd API key
- **Poll interval** — How often Homey checks SABnzbd status, in seconds (default: 10, range: 5–300)

## Example flows

- **Night throttle** — When it's 23:00 → Set speed limit to 50 MB/s. When it's 07:00 → Set speed limit to 0 (unlimited).
- **Download done notification** — When a download completed → Send a push notification with the download name.
- **Pause on arrival** — When I arrive home and SABnzbd is downloading → Pause, to free up bandwidth.
- **Queue cleared** — When queue is empty → Turn off the NAS.
