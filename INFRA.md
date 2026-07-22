# INFRA.md

## 1. 문서 목적

이 문서는 AI Agent 또는 개발자가 프로젝트의 배포 인프라 구조를 빠르게 이해하고, 애플리케이션 배포·운영·장애 대응 시 동일한 기준으로 작업할 수 있도록 작성한다.

Agent는 인프라 관련 코드를 수정하기 전에 반드시 이 문서를 확인해야 한다.

---

## 2. 전체 인프라 개요

서비스는 하나의 VPC 내부에서 다음과 같은 3계층 구조로 운영한다.

```text
사용자
  ↓
Public Load Balancer
  ↓
Web Server
  ↓
Private Load Balancer
  ↓
WAS
  ↓
Managed MySQL / Managed Redis
```

외부 사용자는 Public Load Balancer를 통해서만 서비스에 접근한다.

Web 서버와 WAS는 외부 인터넷에서 직접 접근할 수 없는 Private Subnet에 배치한다.  
운영자는 Bastion Host를 경유하여 Web 서버와 WAS에 접근한다.

Private Subnet에 위치한 서버가 패키지 설치, Docker 이미지 다운로드, 외부 API 호출 등을 수행해야 하는 경우 NAT Gateway를 통해 외부 인터넷으로 통신한다.

---

## 3. 네트워크 구성

### 3.1 VPC

| 항목 | 값 |
| --- | --- |
| VPC CIDR | `192.168.0.0/16` |
| 용도 | 서비스 전체 네트워크 영역 |

모든 서버, Load Balancer, NAT Gateway, Bastion Host, Managed Database는 위 VPC 내부에 위치한다.

---

### 3.2 Subnet 구성

| Subnet | CIDR | 구분 | 주요 리소스 |
| --- | --- | --- | --- |
| Public Subnet 1 | `192.168.24.0/24` | Public | Public Load Balancer |
| Public Subnet 2 | `192.168.25.0/24` | Public | NAT Gateway |
| Public Subnet 3 | `192.168.26.0/24` | Public | Bastion Host |
| Private Subnet 1 | `192.168.22.0/24` | Private | Web 1, Web 2 |
| Private Subnet 2 | `192.168.23.0/24` | Private | Private Load Balancer |
| Private Subnet 3 | `192.168.27.0/24` | Private | WAS 1, WAS 2 |
| Private Subnet 4 | `192.168.28.0/24` | Private | Managed MySQL, Managed Redis |

---

## 4. 서버 및 서비스 구성

### 4.1 Public Load Balancer

외부 사용자의 요청을 가장 먼저 수신한다.

#### 역할

- 외부 트래픽 수신
- HTTPS 종료
- Web 1, Web 2로 트래픽 분산
- Web 서버 Health Check
- 장애가 발생한 Web 서버를 대상 그룹에서 제외

#### 권장 Listener

| 프로토콜 | 포트 | 처리 방식 |
| --- | ---: | --- |
| HTTP | 80 | HTTPS로 Redirect |
| HTTPS | 443 | Web 서버로 전달 |

#### Backend 대상

```text
Web 1
Web 2
```

Public Load Balancer는 Web 서버의 애플리케이션 포트 또는 Nginx 포트로 요청을 전달한다.

---

### 4.2 Web Server

Web 서버는 정적 리소스 제공과 Reverse Proxy 역할을 담당한다.

#### 구성

```text
Web 1
Web 2
```

#### 주요 역할

- 프론트엔드 정적 파일 제공
- Nginx 실행
- `/api` 요청을 Private Load Balancer로 전달
- 클라이언트 라우팅 처리
- 압축, 캐시, 보안 헤더 설정
- 필요 시 WebSocket Upgrade 헤더 전달

#### 기본 요청 흐름

```text
Public Load Balancer
  → Web Server
  → Private Load Balancer
```

#### Agent 작업 규칙

- Web 서버 설정을 수정할 때는 Web 1, Web 2에 동일하게 반영해야 한다.
- Nginx 설정은 서버마다 다르게 관리하지 않는다.
- 환경별 설정값은 코드에 하드코딩하지 않는다.
- Private Load Balancer의 주소는 환경변수 또는 배포 설정으로 주입한다.
- API 서버의 개별 IP로 직접 프록시하지 않는다.

예시:

```nginx
location /api/ {
    proxy_pass http://PRIVATE_LOAD_BALANCER;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

### 4.3 Private Load Balancer

Web 서버에서 전달된 API 요청을 WAS로 분산한다.

#### 역할

- 내부 API 트래픽 수신
- WAS 1, WAS 2로 요청 분산
- WAS Health Check
- 장애 WAS 자동 제외
- Web 계층과 WAS 계층 분리

#### Backend 대상

```text
WAS 1
WAS 2
```

#### 접근 제한

Private Load Balancer는 외부 인터넷에서 접근할 수 없어야 한다.

허용 대상은 원칙적으로 다음과 같다.

```text
Private Subnet 1의 Web 서버
```

---

### 4.4 WAS

WAS는 실제 백엔드 애플리케이션을 실행한다.

#### 구성

```text
WAS 1
WAS 2
```

#### 주요 역할

- REST API 제공
- 인증 및 인가
- 비즈니스 로직 처리
- Managed MySQL 접근
- Managed Redis 접근
- 외부 API 호출
- Health Check Endpoint 제공

#### 배포 원칙

- WAS 1, WAS 2는 동일한 애플리케이션 버전을 실행해야 한다.
- 서버 로컬 디스크에 영구 상태를 저장하지 않는다.
- 세션이나 캐시는 Managed Redis를 사용한다.
- 영구 데이터는 Managed MySQL에 저장한다.
- 환경변수와 Secret은 Git 저장소에 커밋하지 않는다.
- 애플리케이션은 Stateless 구조를 유지한다.

#### Health Check 예시

```text
GET /management/health_check
```

또는 Spring Boot Actuator를 사용하는 경우:

```text
GET /actuator/health
```

Health Check 응답은 인증 없이 접근 가능해야 하지만, 민감한 내부 정보는 포함하지 않는다.

---

### 4.5 Managed MySQL

서비스의 영구 데이터를 저장한다.

#### 접근 주체

```text
WAS 1
WAS 2
```

Web 서버, Public Load Balancer, Bastion Host, 외부 사용자는 MySQL에 직접 접근하지 않는다.

#### 기본 포트

```text
3306
```

#### Agent 작업 규칙

- DB 접속 정보는 환경변수 또는 Secret Manager에서 주입한다.
- 운영 DB 비밀번호를 코드나 Dockerfile에 작성하지 않는다.
- 스키마 변경은 migration 도구를 통해 관리한다.
- 운영 환경에서 `ddl-auto=create`, `create-drop`, `update` 사용을 금지한다.
- 대규모 migration은 서비스 영향도를 검토한 후 진행한다.
- 운영 데이터 삭제 쿼리는 명시적 승인 없이 실행하지 않는다.

현재 MVP 인증 구현은 배포본 실행 시 최신 테이블로 맞추기 위해 Sequelize `sync({ alter: true })`를 사용할 수 있다. 이 동작은 `DB_SYNC_SCHEMA=false` 또는 `DB_SYNC_ALTER=false`로 제어하며, 운영 안정화 단계에서는 migration 기반 관리로 전환한다.

권장 환경변수:

```bash
DB_HOST=
DB_PORT=3306
DB_NAME=
DB_USERNAME=
DB_PASSWORD=
```

---

### 4.6 Managed Redis

캐시, 세션, 분산 락, 메시지 브로커 등의 용도로 사용한다.

#### 접근 주체

```text
WAS 1
WAS 2
```

#### 기본 포트

```text
6379
```

#### Agent 작업 규칙

- Redis 장애 시 전체 서비스 장애로 이어지지 않도록 예외 처리를 고려한다.
- 캐시는 원본 데이터가 아니므로 Redis 데이터만 신뢰하지 않는다.
- Key에 만료 시간이 필요한 경우 TTL을 반드시 설정한다.
- 무제한 증가할 수 있는 Key 구조를 만들지 않는다.
- 운영 Redis에 `FLUSHALL`, `FLUSHDB`를 실행하지 않는다.

권장 환경변수:

```bash
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

### 4.7 NAT Gateway

Private Subnet에 위치한 서버의 외부 통신을 담당한다.

#### 사용 예시

- Docker Registry에서 이미지 Pull
- 운영체제 패키지 다운로드
- 외부 API 호출
- 외부 인증 서버 호출
- 모니터링 또는 로그 전송

#### 통신 방향

```text
Private Subnet
  → NAT Gateway
  → Internet
```

NAT Gateway는 외부에서 Private 서버로 접속하기 위한 용도가 아니다.

외부 사용자는 NAT Gateway를 통해 Web 또는 WAS에 접근할 수 없다.

---

### 4.8 Bastion Host

운영자가 Private Subnet의 서버에 접근하기 위한 중간 접속 서버이다.

#### 접근 흐름

```text
Admin
  → Bastion Host
  → Web 또는 WAS
```

#### Agent 작업 규칙

- 운영 서버의 Public IP를 새로 생성하지 않는다.
- Web 또는 WAS에 외부 SSH 포트를 직접 개방하지 않는다.
- 운영 서버 접근은 Bastion Host를 경유한다.
- SSH Private Key를 저장소에 커밋하지 않는다.
- Bastion Host 접근 IP는 관리자 고정 IP 또는 VPN 대역으로 제한한다.
- 가능하면 비밀번호 로그인을 비활성화하고 SSH Key 방식만 사용한다.

SSH 예시:

```bash
ssh -J bastion-user@BASTION_PUBLIC_IP app-user@PRIVATE_SERVER_IP
```

SSH Config 예시:

```sshconfig
Host bastion
    HostName BASTION_PUBLIC_IP
    User bastion-user
    IdentityFile ~/.ssh/service-key.pem

Host was-1
    HostName WAS_1_PRIVATE_IP
    User app-user
    IdentityFile ~/.ssh/service-key.pem
    ProxyJump bastion
```

---

## 5. 전체 요청 흐름

### 5.1 사용자 웹 요청

```text
1. 사용자가 서비스 도메인으로 접속한다.
2. DNS가 Public Load Balancer를 가리킨다.
3. Public Load Balancer가 Web 1 또는 Web 2로 요청을 전달한다.
4. Web 서버가 프론트엔드 정적 파일을 반환한다.
```

### 5.2 API 요청

```text
1. 사용자가 `/api/**` 요청을 보낸다.
2. Public Load Balancer가 Web 서버로 요청을 전달한다.
3. Web 서버의 Nginx가 요청을 Private Load Balancer로 프록시한다.
4. Private Load Balancer가 WAS 1 또는 WAS 2로 요청을 분산한다.
5. WAS가 비즈니스 로직을 수행한다.
6. 필요한 경우 Managed MySQL 또는 Managed Redis에 접근한다.
7. 응답은 요청 경로의 역순으로 사용자에게 전달된다.
```

### 5.3 서버의 외부 인터넷 통신

```text
Web 또는 WAS
  → Private Subnet Route Table
  → NAT Gateway
  → Internet
```

---

## 6. 보안 정책

### 6.1 네트워크 접근 원칙

서비스는 필요한 구간에만 통신을 허용한다.

```text
Internet
  → Public Load Balancer
  → Web
  → Private Load Balancer
  → WAS
  → MySQL / Redis
```

계층을 건너뛴 직접 접근은 허용하지 않는다.

예:

- Internet → WAS 금지
- Internet → MySQL 금지
- Web → MySQL 금지
- Bastion → MySQL 직접 접근은 기본적으로 금지
- Public Load Balancer → WAS 직접 접근 금지

---

### 6.2 권장 접근 제어

| Source | Destination | Port | 용도 |
| --- | --- | ---: | --- |
| Internet | Public Load Balancer | 443 | 사용자 HTTPS 요청 |
| Internet | Public Load Balancer | 80 | HTTPS Redirect |
| Public Load Balancer | Web | 80 또는 지정 포트 | Web 요청 전달 |
| Web | Private Load Balancer | 백엔드 Listener 포트 | API 요청 전달 |
| Private Load Balancer | WAS | 애플리케이션 포트 | API 요청 전달 |
| WAS | Managed MySQL | 3306 | DB 연결 |
| WAS | Managed Redis | 6379 | Redis 연결 |
| 관리자 허용 IP | Bastion Host | 22 | 운영 접속 |
| Bastion Host | Web/WAS | 22 | 서버 관리 |
| Private Subnet | NAT Gateway | 443/80 | 외부 통신 |

보안 그룹 또는 ACG 규칙은 가능하면 IP 대역보다 리소스 그룹 간 참조 방식으로 구성한다.

---

## 7. 배포 방식

### 7.1 기본 배포 단위

배포 대상은 다음 두 계층이다.

```text
Web 1, Web 2
WAS 1, WAS 2
```

DB, Redis, Load Balancer, NAT Gateway는 일반 애플리케이션 배포 대상이 아니다.

---

### 7.2 권장 WAS 배포 순서

서비스 중단을 최소화하기 위해 순차 배포를 사용한다.

```text
1. WAS 1을 Private Load Balancer 대상 그룹에서 제외한다.
2. WAS 1에 새 버전을 배포한다.
3. WAS 1의 Health Check를 확인한다.
4. WAS 1을 대상 그룹에 다시 등록한다.
5. 정상 트래픽 처리를 확인한다.
6. WAS 2도 동일한 방식으로 배포한다.
```

두 WAS를 동시에 중지하거나 재시작하지 않는다.

---

### 7.3 권장 Web 배포 순서

```text
1. Web 1을 Public Load Balancer 대상 그룹에서 제외한다.
2. Web 1에 새 정적 파일 또는 Nginx 설정을 배포한다.
3. Web 1의 Health Check를 확인한다.
4. Web 1을 대상 그룹에 다시 등록한다.
5. Web 2도 동일한 방식으로 배포한다.
```

---

### 7.4 Docker 배포 예시

애플리케이션이 Docker 기반이라면 서버는 Registry에서 이미지를 Pull하여 실행한다.

```bash
docker pull ${IMAGE_NAME}:${IMAGE_TAG}

docker compose up -d
```

배포 후 확인:

```bash
docker ps
docker compose ps
docker compose logs --tail=200
curl -f http://localhost:${APP_PORT}/management/health_check
```

Agent는 운영 서버에서 다음 명령을 임의로 실행하지 않는다.

```bash
docker system prune -a
docker volume prune
docker rm -f $(docker ps -aq)
```

위 명령은 다른 서비스 컨테이너, 이미지, 볼륨까지 삭제할 수 있으므로 명시적 승인 후에만 사용한다.

---

## 8. 환경변수 관리

환경별 값은 코드와 분리한다.

예시:

```bash
SPRING_PROFILES_ACTIVE=prod

SERVER_PORT=8080

DB_HOST=
DB_PORT=3306
DB_NAME=
DB_USERNAME=
DB_PASSWORD=

REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=
CORS_ALLOWED_ORIGINS=
```

### 금지 사항

```text
- application.yml에 운영 비밀번호 직접 작성
- Dockerfile에 Secret 작성
- GitHub 저장소에 .env 커밋
- 로그에 Access Token, Password, Secret 출력
```

---

## 9. 로깅 및 모니터링

최소한 다음 항목을 모니터링한다.

### Load Balancer

- 요청 수
- 4xx 응답 수
- 5xx 응답 수
- Healthy Host 수
- Unhealthy Host 수
- 응답 시간

### Web

- CPU 사용률
- 메모리 사용률
- 디스크 사용률
- Nginx 4xx/5xx
- Upstream 연결 오류

### WAS

- CPU 사용률
- 메모리 사용률
- JVM Heap
- GC 횟수 및 시간
- Thread 수
- HTTP 응답 시간
- HTTP 5xx
- DB Connection Pool
- Redis 연결 오류

### MySQL

- CPU 사용률
- Connection 수
- Slow Query
- Disk 사용량
- Replication 또는 HA 상태

### Redis

- 메모리 사용률
- Connection 수
- Key 수
- Eviction 수
- Hit/Miss 비율

---

## 10. 장애 대응 기준

### Web 서버 한 대 장애

```text
Public Load Balancer가 장애 서버를 제외하고 나머지 Web 서버로 요청을 전달한다.
```

### WAS 한 대 장애

```text
Private Load Balancer가 장애 서버를 제외하고 나머지 WAS로 요청을 전달한다.
```

### MySQL 장애

- 애플리케이션에서 DB 연결 실패가 발생한다.
- 재시도는 무제한으로 수행하지 않는다.
- Managed MySQL의 HA 또는 복구 상태를 확인한다.
- 데이터 변경 작업은 DB 정상화 후 재처리 기준을 따른다.

### Redis 장애

- Redis 의존 기능에서 오류가 발생할 수 있다.
- 단순 캐시 기능은 DB 조회로 우회할 수 있도록 설계한다.
- 세션, 분산 락, Pub/Sub 등 핵심 기능 사용 시 장애 영향을 별도로 검토한다.

### NAT Gateway 장애

- 기존 사용자 요청 처리는 가능할 수 있다.
- Private 서버의 외부 API 호출, 이미지 Pull, 패키지 설치가 실패할 수 있다.
- 내부 서비스 통신 자체는 NAT Gateway를 경유하지 않는다.

---

## 11. Agent 필수 준수사항

Agent는 인프라 또는 배포 관련 작업 시 다음 규칙을 준수한다.

1. Web과 WAS는 Private Subnet에 위치한다고 가정한다.
2. 외부 요청은 반드시 Public Load Balancer를 경유한다.
3. API 요청은 Web과 Private Load Balancer를 차례로 경유한다.
4. Web에서 특정 WAS IP로 직접 연결하지 않는다.
5. WAS 외의 계층에서 MySQL과 Redis에 직접 접근하지 않는다.
6. 운영 Secret을 코드나 문서에 실제 값으로 기록하지 않는다.
7. 두 대의 동일 계층 서버를 동시에 중단하지 않는다.
8. 배포 전후 Health Check를 수행한다.
9. 운영 데이터와 Docker Volume을 명시적 승인 없이 삭제하지 않는다.
10. 방화벽, 보안 그룹, ACG를 전체 대역에 개방하지 않는다.
11. `0.0.0.0/0` SSH 허용 규칙을 만들지 않는다.
12. 운영 서버에 Public IP를 임의로 부여하지 않는다.
13. 서버 접근은 Bastion Host를 경유한다.
14. 장애 발생 시 우선 Load Balancer Health 상태와 애플리케이션 로그를 확인한다.
15. 인프라 구조 변경이 필요한 경우 구현 전에 변경 이유와 영향 범위를 설명한다.

---

## 12. Agent가 배포 작업 전 확인할 항목

```text
[ ] 배포 대상이 Web인지 WAS인지 확인
[ ] 대상 서버와 현재 실행 버전 확인
[ ] 새 이미지 또는 빌드 산출물의 버전 확인
[ ] 환경변수 변경 여부 확인
[ ] DB Migration 포함 여부 확인
[ ] 하위 호환성 여부 확인
[ ] Load Balancer 대상 제외 계획 확인
[ ] Health Check URL 확인
[ ] Rollback 이미지 또는 이전 버전 확인
[ ] 로그 확인 명령 준비
```

---

## 13. Agent가 배포 후 확인할 항목

```text
[ ] 컨테이너 또는 프로세스가 정상 실행 중인지 확인
[ ] Health Check가 200을 반환하는지 확인
[ ] Load Balancer에서 Healthy 상태인지 확인
[ ] 주요 API가 정상 응답하는지 확인
[ ] 5xx 증가 여부 확인
[ ] DB Connection Pool 이상 여부 확인
[ ] Redis 연결 오류 여부 확인
[ ] 배포 대상 전체에 동일 버전이 적용되었는지 확인
```

---

## 14. Rollback 원칙

배포 후 오류가 발생하면 다음 순서로 Rollback한다.

```text
1. 신규 버전 서버를 Load Balancer 대상에서 제외한다.
2. 직전 정상 이미지 또는 빌드로 재배포한다.
3. Health Check를 확인한다.
4. Load Balancer 대상에 다시 등록한다.
5. 로그와 모니터링 지표를 확인한다.
```

DB Migration이 포함된 경우 애플리케이션 Rollback만으로 복구되지 않을 수 있다.

따라서 운영 DB Migration은 가능한 한 다음 원칙을 따른다.

```text
- 기존 컬럼을 즉시 삭제하지 않는다.
- 신규 컬럼 추가 후 양쪽 버전이 호환되도록 한다.
- 데이터 백필과 코드 전환을 분리한다.
- 컬럼 삭제는 이전 버전이 완전히 제거된 이후 진행한다.
```

---

## 15. 미확정 항목

다음 값은 실제 배포 환경에 맞게 추가 작성해야 한다.

| 항목 | 현재 상태 |
| --- | --- |
| Cloud Provider | 미확정 |
| Region | 미확정 |
| Domain | 미확정 |
| Public Load Balancer 주소 | 미확정 |
| Private Load Balancer 주소 | 미확정 |
| Web Server OS | 미확정 |
| WAS Server OS | 미확정 |
| Container Registry | 미확정 |
| CI/CD 도구 | 미확정 |
| Web Health Check URL | 미확정 |
| WAS Health Check URL | 미확정 |
| WAS Application Port | 미확정 |
| 로그 수집 도구 | 미확정 |
| 모니터링 도구 | 미확정 |
| Secret 관리 방식 | 미확정 |
| Backup 및 복구 정책 | 미확정 |

---

## 16. 인프라 다이어그램

현재 인프라 구조는 아래 이미지를 기준으로 한다.

```text
VPC: 192.168.0.0/16

Public Subnet 1  : Public Load Balancer
Private Subnet 1 : Web 1, Web 2
Private Subnet 2 : Private Load Balancer
Private Subnet 3 : WAS 1, WAS 2
Private Subnet 4 : Managed MySQL, Managed Redis
Public Subnet 2  : NAT Gateway
Public Subnet 3  : Bastion Host
```

다이어그램과 이 문서가 불일치하는 경우 실제 운영 환경을 먼저 확인하고, 확인된 내용을 기준으로 이 문서를 수정한다.
