# Website Compare

A powerful web application for automated website screenshot comparison and visual regression testing. Monitor your websites for visual changes, compare different versions, and get notified when unexpected changes occur.

## 🚀 Features

### Core Functionality
- **Automated Screenshot Capture**: Take full-page screenshots of web pages using Puppeteer
- **Visual Comparison**: Compare screenshots with baseline images using pixel-perfect diff detection
- **Baseline Management**: Set and update baseline screenshots for comparison
- **Bulk Operations**: Run comparisons across multiple pages simultaneously

### User Management & Collaboration
- **User Authentication**: Secure login and registration system with NextAuth.js
- **Website Sharing**: Share websites with other users and manage permissions
- **Invitation System**: Invite collaborators to access and manage websites
- **Permission Control**: Owner and editor roles for fine-grained access control

### Notifications & Monitoring
- **Email Notifications**: Automatic email alerts when comparisons fail
- **Multiple Email Providers**: Support for SMTP, SendGrid, and AWS SES
- **Detailed Reports**: Comprehensive failure reports with error details and context
- **Bulk Failure Notifications**: Summary emails for multiple failed comparisons

### Technical Features
- **Responsive Design**: Modern, mobile-friendly interface built with Tailwind CSS
- **Real-time Updates**: Live status updates for comparison operations
- **Docker Support**: Containerized deployment with Docker and Docker Compose
- **Database Integration**: PostgreSQL with Prisma ORM for data management

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Screenshot Engine**: Puppeteer
- **Image Processing**: pngjs, pixelmatch
- **Email Service**: Nodemailer
- **Deployment**: Docker, Docker Compose, Nginx

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Docker (optional, for containerized deployment)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/website-compare.git
cd website-compare
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/website_compare"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Email Configuration (optional, for notifications)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
EMAIL_FROM="your-email@gmail.com"
EMAIL_FROM_NAME="Website Compare"
```

### 4. Database Setup

Set up your PostgreSQL database and run migrations:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Seed the database
npx prisma db seed
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## 🐳 Docker Deployment

### Development with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Production Deployment

```bash
# Build and start production services
docker-compose -f docker-compose.production.yml up -d
```

The application will be available at `http://localhost` (port 80).

## 📖 Usage

### Adding a Website

1. **Register/Login**: Create an account or log in to your existing account
2. **Add Website**: Click "Add Website" and provide the website name and URL
3. **Add Pages**: Add individual pages you want to monitor with their paths
4. **Take Baseline**: Capture initial screenshots to use as baselines

### Running Comparisons

1. **Single Page**: Navigate to a page and click "Run Comparison"
2. **Bulk Comparison**: Use "Compare All Pages" to run comparisons across all pages
3. **View Results**: Check the comparison status and view diff images
4. **Update Baselines**: Set new baselines when legitimate changes occur

### Managing Collaborators

1. **Share Website**: Use the "Share" feature to invite collaborators
2. **Set Permissions**: Assign owner or editor roles
3. **Manage Access**: View and revoke access as needed

## 🔧 Configuration

### Email Providers

#### SMTP (Default)
```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

#### SendGrid
```env
EMAIL_PROVIDER="sendgrid"
SENDGRID_API_KEY="your-sendgrid-api-key"
EMAIL_FROM="noreply@yourdomain.com"
```

### Database Configuration

The application uses PostgreSQL with Prisma ORM. The database schema includes:

- **Users**: User accounts and authentication
- **Websites**: Website configurations and metadata
- **Pages**: Individual pages within websites
- **Comparisons**: Screenshot comparison records and results
- **WebsiteShares**: User permissions and access control
- **WebsiteInvitations**: Pending collaboration invitations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/website-compare/issues) page
2. Create a new issue with detailed information
3. Include error logs and environment details

## 🔮 Roadmap

- [ ] Scheduled comparisons with cron jobs
- [ ] Webhook integrations for CI/CD pipelines
- [ ] Advanced diff visualization options
- [ ] Mobile app for monitoring
- [ ] Integration with popular testing frameworks
- [ ] Custom comparison thresholds and sensitivity settings
