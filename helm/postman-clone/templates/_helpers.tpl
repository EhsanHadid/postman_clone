{{/*
Expand the name of the chart.
*/}}
{{- define "postman-clone.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "postman-clone.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
API fully qualified name.
*/}}
{{- define "postman-clone.api.fullname" -}}
{{- printf "%s-api" (include "postman-clone.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Web fully qualified name.
*/}}
{{- define "postman-clone.web.fullname" -}}
{{- printf "%s-web" (include "postman-clone.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart label value.
*/}}
{{- define "postman-clone.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "postman-clone.labels" -}}
helm.sh/chart: {{ include "postman-clone.chart" . }}
app.kubernetes.io/name: {{ include "postman-clone.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- if .Values.commonLabels }}
{{ toYaml .Values.commonLabels }}
{{- end }}
{{- end }}

{{/*
API selector labels.
*/}}
{{- define "postman-clone.api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "postman-clone.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: api
{{- end }}

{{/*
Web selector labels.
*/}}
{{- define "postman-clone.web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "postman-clone.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: web
{{- end }}

{{/*
API service account name.
*/}}
{{- define "postman-clone.api.serviceAccountName" -}}
{{- if .Values.api.serviceAccount.create }}
{{- default (include "postman-clone.api.fullname" .) .Values.api.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.api.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Web service account name.
*/}}
{{- define "postman-clone.web.serviceAccountName" -}}
{{- if .Values.web.serviceAccount.create }}
{{- default (include "postman-clone.web.fullname" .) .Values.web.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.web.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
API image reference.
*/}}
{{- define "postman-clone.api.image" -}}
{{- $registry := .Values.api.image.registry | default .Values.global.imageRegistry -}}
{{- $tag := .Values.api.image.tag | default .Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry .Values.api.image.repository $tag -}}
{{- else -}}
{{- printf "%s:%s" .Values.api.image.repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Web image reference.
*/}}
{{- define "postman-clone.web.image" -}}
{{- $registry := .Values.web.image.registry | default .Values.global.imageRegistry -}}
{{- $tag := .Values.web.image.tag | default .Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry .Values.web.image.repository $tag -}}
{{- else -}}
{{- printf "%s:%s" .Values.web.image.repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Database host — subchart or external.
*/}}
{{- define "postman-clone.databaseHost" -}}
{{- if .Values.mysql.enabled -}}
{{- printf "%s-mysql" .Release.Name -}}
{{- else -}}
{{- .Values.externalDatabase.host -}}
{{- end -}}
{{- end }}

{{/*
Database port.
*/}}
{{- define "postman-clone.databasePort" -}}
{{- if .Values.mysql.enabled -}}
3306
{{- else -}}
{{- .Values.externalDatabase.port | default 3306 -}}
{{- end -}}
{{- end }}

{{/*
Database name.
*/}}
{{- define "postman-clone.databaseName" -}}
{{- if .Values.mysql.enabled -}}
{{- .Values.mysql.auth.database -}}
{{- else -}}
{{- .Values.externalDatabase.database -}}
{{- end -}}
{{- end }}

{{/*
Secret name holding DB credentials.
*/}}
{{- define "postman-clone.api.secretName" -}}
{{- if .Values.api.secrets.existingSecret -}}
{{- .Values.api.secrets.existingSecret -}}
{{- else -}}
{{- include "postman-clone.api.fullname" . -}}
{{- end -}}
{{- end }}

{{/*
Image pull secrets merged from global + per-deployment.
*/}}
{{- define "postman-clone.imagePullSecrets" -}}
{{- $secrets := .Values.global.imagePullSecrets | default list -}}
{{- if $secrets }}
imagePullSecrets:
{{- range $secrets }}
  - name: {{ .name }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Namespace.
*/}}
{{- define "postman-clone.namespace" -}}
{{- .Values.namespaceOverride | default .Release.Namespace -}}
{{- end }}
