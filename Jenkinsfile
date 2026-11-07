pipeline {
    agent any

    environment {
        IMAGE_NAME = "online-shopping:${BUILD_NUMBER}"
        BASE_URL = "http://localhost:3000"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm test'
            }
        }

        stage('Selenium Browser Test') {
            steps {
                sh '''
                    npm start > app.log 2>&1 &
                    APP_PID=$!
                    trap 'kill $APP_PID 2>/dev/null || true' EXIT

                    echo "Waiting for application to start..."

                    for i in $(seq 1 30); do
                        if curl -fsS http://localhost:3000 > /dev/null; then
                            echo "Application is running."
                            break
                        fi
                        sleep 2
                    done

                    curl -fsS http://localhost:3000 > /dev/null

                    echo "Running Selenium browser test..."
                    npm run test:selenium
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $IMAGE_NAME .'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished. Review stage results above.'
        }
    }
}
