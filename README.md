# Team Submission Manager

A modern, responsive web application for managing team submissions with Supabase integration. This application allows you to view, accept, and reject team submissions with a beautiful, user-friendly interface.

## Features

- **Three Status Tabs**: Ready for Review, Completed, and Rejected teams
- **Team Details Modal**: View comprehensive team information and member submissions
- **Accept/Reject Functionality**: Manage team status with one-click actions
- **Real-time Updates**: Automatic refresh and status updates
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Modern UI**: Beautiful gradient design with smooth animations
- **Loading States**: Professional loading indicators and notifications

## File Structure

```
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── script.js           # JavaScript functionality and Supabase integration
├── README.md           # This file
└── CSV Files/          # Your data reference files
    ├── Supabase Snippet Team Leader Information.csv
    └── Supabase Snippet Untitled query.csv
```

## Setup Instructions

### 1. Supabase Configuration

To connect to your Supabase database, you need to:

1. **Get your Supabase credentials**:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy your Project URL and anon/public key

2. **Update the JavaScript file**:
   - Open `script.js`
   - Replace `YOUR_SUPABASE_URL` with your actual Supabase URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your actual anon key

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 2. Database Tables

Make sure your Supabase database has these tables:

#### Team Leader Form Table
- `id` (int, primary key)
- `Code` (text)
- `Name` (text)
- `Phone` (text)
- `Team Members` (int)
- `Country` (text)
- `City` (text)
- `Square` (text)
- `Street` (text)
- `Additional Info` (text)
- `Order Option` (text)
- `Status` (int) - 0=ready, 1=completed, 2=rejected
- `Folder URL` (text)

#### Team Member Submission Table
- `id` (int, primary key)
- `TeamCode` (text) - matches the Code from team leader form
- `Name` (text)
- `Phone` (text)
- `Size` (text)
- `JacketColor` (text)
- `SleeveColor` (text)
- `SleeveRubberColor` (text)
- `Image1` (text) - URL to image
- `Image1Comment` (text)
- `Status` (text)

### 3. Deployment

#### Option 1: GitHub Pages (Recommended)

1. **Create a GitHub repository**
2. **Upload all files** to the repository
3. **Enable GitHub Pages**:
   - Go to Settings > Pages
   - Select source branch (usually `main`)
   - Save

Your site will be available at: `https://yourusername.github.io/repository-name`

#### Option 2: Local Development

1. **Install a local server** (if needed):
   ```bash
   npm install -g http-server
   ```

2. **Run the server**:
   ```bash
   http-server
   ```

3. **Open your browser** and go to `http://localhost:8080`

### 4. Testing

The application includes mock data for testing. You can:

1. **Test without Supabase**: The app will use mock data if Supabase credentials aren't configured
2. **Test with Supabase**: Configure your credentials and test with real data

## Usage

### Viewing Teams

1. **Ready Tab**: Shows teams with status "Ready" (Status = 0)
2. **Completed Tab**: Shows teams with status "Completed" (Status = 1)
3. **Rejected Tab**: Shows teams with status "Rejected" (Status = 2)

### Managing Teams

1. **Click "View Details"** on any team card
2. **Review team information** and member submissions
3. **Click "Accept"** to approve the team (changes status to 1)
4. **Click "Reject"** to reject the team (changes status to 2)

### Features

- **Responsive Design**: Works on all device sizes
- **Real-time Updates**: Status changes are reflected immediately
- **Loading States**: Professional loading indicators
- **Notifications**: Success/error messages for user feedback
- **Image Viewing**: Direct links to team member images
- **Search and Filter**: Easy navigation between different statuses

## Customization

### Styling

The application uses CSS custom properties for easy theming. You can modify:

- **Colors**: Update the gradient values in `styles.css`
- **Fonts**: Change the font-family in the body selector
- **Layout**: Adjust grid and spacing values

### Functionality

- **Add new features**: Extend the JavaScript functions in `script.js`
- **Modify data structure**: Update the mock data and database queries
- **Add authentication**: Integrate Supabase Auth for user management

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

### Common Issues

1. **Supabase Connection Error**:
   - Check your URL and API key
   - Ensure your database tables exist
   - Verify Row Level Security (RLS) policies

2. **Images Not Loading**:
   - Check if the image URLs are accessible
   - Ensure proper CORS settings

3. **Status Not Updating**:
   - Check browser console for errors
   - Verify database permissions

### Debug Mode

Open browser console (F12) to see:
- Connection status
- Data loading progress
- Error messages

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify your Supabase configuration
3. Ensure all files are properly uploaded

## License

This project is open source and available under the MIT License. 