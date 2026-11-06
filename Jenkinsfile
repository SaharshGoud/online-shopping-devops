pipeline {
  agent any
  environment {
    IMAGE_NAME = "online-shopping:${BUILD_NUMBER}"
    // Set KUBECONFIG credential in Jenkins for the deploy stage.
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Install') {
      steps { sh 'npm install' }
    }
    stage('Unit Tests') {
      steps { sh 'npm test' }
    }
    stage('Build Docker Image') {
      steps { sh 'docker build -t $IMAGE_NAME .' }
    }
    stage('Deploy to Kubernetes') {
      when { branch 'main' }
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
          sh 'kubectl apply -f k8s/'
          sh 'kubectl rollout status deployment/online-shopping --timeout=120s'
        }
      }
    }
  }
  post {
    always { echo 'Pipeline finished. Review stage results above.' }
  }
}
