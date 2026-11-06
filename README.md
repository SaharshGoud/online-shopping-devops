# Online Shopping and Order Management System (DevOps Case Study)

## Technology stack
- Node.js + Express REST API
- HTML, CSS, JavaScript frontend
- JSON file data store (for classroom/demo use)
- Git/GitHub, Jenkins, Docker, Kubernetes, Selenium

## Modules
Customer registration/login, product catalogue/search, add/update/remove cart items, checkout, order history, and admin product CRUD.

## Run locally (macOS/Linux)
```bash
npm install
npm start
```
Open http://localhost:3000. Demo admin login: `admin@shop.com` / `admin123`.

## Tests
```bash
npm test
```
Selenium smoke test (app must be running and Chrome/ChromeDriver installed):
```bash
npm install
BASE_URL=http://localhost:3000 node tests/selenium-smoke.js
```

## Docker
```bash
docker compose up --build -d
docker compose logs -f
```
Open http://localhost:3000. Persistent data is stored in the named volume `shopping-data`.

## Kubernetes (local cluster, e.g. Minikube)
Build image in Minikube's Docker daemon:
```bash
minikube start
eval $(minikube docker-env)
docker build -t online-shopping:1 .
kubectl create secret generic shopping-secrets --from-literal=session-secret='replace-with-a-long-random-secret'
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/online-shopping
minikube service online-shopping-service
```
Note: JSON file storage with multiple replicas and ReadWriteOnce PVC is intended as a DevOps lab demonstration, not production architecture. For production, use a shared database (PostgreSQL), password hashing, CSRF protection, HTTPS, and secure session storage.

## Jenkins
1. Configure Jenkins with Git, NodeJS, Docker and Kubernetes CLI tools on its agent.
2. Create a Pipeline job connected to this repository and select `Jenkinsfile`.
3. Add a Jenkins secret file credential with ID `kubeconfig` containing your cluster kubeconfig.
4. Make sure the Kubernetes cluster can access the image built by Jenkins. For a remote cluster, push to a registry and update the image reference in `k8s/deployment.yaml`.
5. Pipeline runs checkout → npm ci → tests → Docker build → Kubernetes deploy on `main`.

## Admin
Admin demo credentials above. Do not use demo credentials in a real deployment.
